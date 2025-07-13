/**
 * Cloudflare Pages Function - 测试 API
 * 
 * 这个文件为 Cloudflare Pages 部署提供 NAT64 延迟测试 API
 */

// 导入 Cloudflare Sockets API
import { connect } from 'cloudflare:sockets';

// 配置常量
const TEST_CONFIG = {
  IPV4_TARGET: '1.1.1.1',
  LATENCY_TEST_COUNT: 3,
  MIN_LATENCY: 10,
  MAX_LATENCY: 5000,
};

const HTTP_CONFIG = {
  HTTPS_PORT: 443,
  HTTP_REQUEST_TEMPLATE: 'HEAD / HTTP/1.1\r\nHost: one.one.one.one\r\nConnection: close\r\n\r\n',
};

/**
 * Pages Function 主处理器
 */
export async function onRequest(context) {
  const { request } = context;
  
  // 处理 CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 只允许 GET 请求
  if (request.method !== 'GET') {
    return createErrorResponse('只支持 GET 请求', 405);
  }

  // 获取并验证前缀参数
  const url = new URL(request.url);
  const prefix = url.searchParams.get('prefix');
  
  if (!prefix || !prefix.includes('::/96')) {
    return createErrorResponse('无效或缺少 "prefix" 参数', 400);
  }

  try {
    console.log(`开始测试前缀: ${prefix}`);
    
    const result = await testNat64Provider(prefix);
    
    console.log(`前缀 ${prefix} 测试完成:`, {
      status: result.status,
      avgLatency: result.avgLatency
    });
    
    return createJsonResponse(result);
    
  } catch (error) {
    console.error(`测试前缀 ${prefix} 失败:`, error);
    return createErrorResponse(`测试失败: ${error.message}`, 500);
  }
}

/**
 * 测试单个 NAT64 提供商
 */
async function testNat64Provider(prefix) {
  try {
    const latencyResult = await testLatency(prefix);
    return { 
      prefix, 
      ...latencyResult, 
      status: 'OK' 
    };
  } catch (error) {
    console.error(`测试前缀 ${prefix} 失败:`, error);
    return { 
      prefix, 
      status: '失败', 
      error: error.message, 
      avgLatency: Infinity, 
      totalLatency: Infinity 
    };
  }
}

/**
 * 执行延迟测试
 */
async function testLatency(prefix) {
  const latencies = [];
  const targetAddress = constructNat64Address(prefix, TEST_CONFIG.IPV4_TARGET);

  for (let i = 0; i < TEST_CONFIG.LATENCY_TEST_COUNT; i++) {
    try {
      const latency = await performSingleLatencyTest(targetAddress);
      latencies.push(latency);
    } catch (error) {
      console.warn(`延迟测试第 ${i + 1} 次失败:`, error.message);
      latencies.push(Infinity);
    }
  }

  return calculateLatencyStats(latencies);
}

/**
 * 执行单次延迟测试
 */
async function performSingleLatencyTest(targetAddress) {
  const startTime = Date.now();
  
  try {
    const socket = await connect({
      hostname: targetAddress,
      port: HTTP_CONFIG.HTTPS_PORT,
      secureTransport: "on"
    });

    await validateConnection(socket);
    await socket.close();
    
    const endTime = Date.now();
    const latency = endTime - startTime;

    if (latency < TEST_CONFIG.MIN_LATENCY || latency > TEST_CONFIG.MAX_LATENCY) {
      throw new Error(`Unrealistic latency: ${latency}ms`);
    }

    return latency;
  } catch (error) {
    throw new Error(`连接测试失败: ${error.message}`);
  }
}

/**
 * 验证连接有效性
 */
async function validateConnection(socket) {
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();

  try {
    await writer.write(new TextEncoder().encode(HTTP_CONFIG.HTTP_REQUEST_TEMPLATE));
    await writer.close();

    const { value } = await reader.read();
    
    if (!value || value.length === 0) {
      throw new Error('No response received');
    }

    const responseText = new TextDecoder().decode(value);
    if (!responseText.includes('HTTP/')) {
      throw new Error('Invalid HTTP response');
    }
  } finally {
    try {
      await reader.cancel();
    } catch (e) {
      // 忽略取消错误
    }
  }
}

/**
 * 构造 NAT64 地址
 */
function constructNat64Address(prefix, ipv4) {
  const cleanedPrefix = prefix.replace(/::\/96$/, '::');
  const parts = ipv4.split('.');
  const hex = parts.map(part => parseInt(part, 10).toString(16).padStart(2, '0'));
  return `[${cleanedPrefix}${hex[0]}${hex[1]}:${hex[2]}${hex[3]}]`;
}

/**
 * 计算延迟统计信息
 */
function calculateLatencyStats(latencies) {
  const successfulPings = latencies.filter(l => l !== Infinity && !isNaN(l));
  
  if (successfulPings.length === 0) {
    return {
      avgLatency: Infinity,
      totalLatency: Infinity,
      successCount: 0,
      totalCount: latencies.length
    };
  }

  const totalLatency = successfulPings.reduce((sum, latency) => sum + latency, 0);
  const avgLatency = totalLatency / successfulPings.length;

  return {
    avgLatency: Math.round(avgLatency),
    totalLatency: Math.round(totalLatency),
    successCount: successfulPings.length,
    totalCount: latencies.length
  };
}

/**
 * 创建 JSON 响应
 */
function createJsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

/**
 * 创建错误响应
 */
function createErrorResponse(message, status = 500) {
  return createJsonResponse({ error: message }, status);
}
