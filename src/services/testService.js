/**
 * 测试服务 - 处理 NAT64 延迟测试逻辑
 */

import { connect } from 'cloudflare:sockets';
import { 
  TEST_CONFIG, 
  HTTP_CONFIG, 
  ERROR_MESSAGES, 
  REGEX 
} from '../config/constants.js';
import { 
  constructNat64Address, 
  isValidLatency, 
  calculateLatencyStats 
} from '../utils/helpers.js';

/**
 * 测试单个 NAT64 提供商
 * @param {string} prefix - NAT64 前缀
 * @returns {Promise<Object>} - 测试结果
 */
export async function testNat64Provider(prefix) {
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
 * @param {string} prefix - NAT64 前缀
 * @returns {Promise<Object>} - 延迟测试结果
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
 * @param {string} targetAddress - 目标地址
 * @returns {Promise<number>} - 延迟时间（毫秒）
 */
async function performSingleLatencyTest(targetAddress) {
  const startTime = Date.now();
  
  try {
    // 建立HTTPS连接
    const socket = await connect({
      hostname: targetAddress,
      port: HTTP_CONFIG.HTTPS_PORT,
      secureTransport: "on"
    });

    // 验证连接：发送HTTP请求并等待响应
    await validateConnection(socket);
    
    await socket.close();
    
    const endTime = Date.now();
    const latency = endTime - startTime;

    // 验证延迟合理性
    if (!isValidLatency(latency, TEST_CONFIG.MIN_LATENCY, TEST_CONFIG.MAX_LATENCY)) {
      throw new Error(`${ERROR_MESSAGES.UNREALISTIC_LATENCY}: ${latency}ms`);
    }

    return latency;
  } catch (error) {
    throw new Error(`连接测试失败: ${error.message}`);
  }
}

/**
 * 验证连接有效性
 * @param {Socket} socket - 连接套接字
 * @returns {Promise<void>}
 */
async function validateConnection(socket) {
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();

  try {
    // 发送HTTP HEAD请求
    await writer.write(new TextEncoder().encode(HTTP_CONFIG.HTTP_REQUEST_TEMPLATE));
    await writer.close();

    // 读取响应以验证连接成功
    const { value } = await reader.read();
    
    if (!value || value.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_RESPONSE);
    }

    // 检查是否收到HTTP响应
    const responseText = new TextDecoder().decode(value);
    if (!REGEX.HTTP_RESPONSE.test(responseText)) {
      throw new Error(ERROR_MESSAGES.INVALID_HTTP_RESPONSE);
    }
  } finally {
    // 确保资源被正确释放
    try {
      await reader.cancel();
    } catch (e) {
      // 忽略取消错误
    }
  }
}

/**
 * 批量测试多个前缀
 * @param {Array} prefixes - 前缀数组
 * @param {Function} onProgress - 进度回调函数
 * @param {number} concurrentLimit - 并发限制
 * @returns {Promise<Array>} - 测试结果数组
 */
export async function batchTestPrefixes(prefixes, onProgress = null, concurrentLimit = TEST_CONFIG.CONCURRENT_LIMIT) {
  const results = [];
  let completedCount = 0;

  // 创建并发控制的测试任务
  const testPromises = prefixes.map(async (prefixInfo, index) => {
    const { prefix } = prefixInfo;
    
    try {
      const result = await testNat64Provider(prefix);
      
      // 合并前缀信息和测试结果
      const fullResult = {
        ...prefixInfo,
        ...result
      };
      
      results[index] = fullResult;
      
      completedCount++;
      if (onProgress) {
        onProgress(completedCount, prefixes.length, fullResult);
      }
      
      return fullResult;
    } catch (error) {
      const errorResult = {
        ...prefixInfo,
        status: '错误',
        error: error.message,
        avgLatency: Infinity,
        totalLatency: Infinity
      };
      
      results[index] = errorResult;
      
      completedCount++;
      if (onProgress) {
        onProgress(completedCount, prefixes.length, errorResult);
      }
      
      return errorResult;
    }
  });

  // 等待所有测试完成
  await Promise.all(testPromises);
  
  return results;
}

/**
 * 获取测试统计信息
 * @param {Array} results - 测试结果数组
 * @returns {Object} - 统计信息
 */
export function getTestStats(results) {
  const total = results.length;
  const successful = results.filter(r => r.status === 'OK').length;
  const failed = total - successful;
  
  const validLatencies = results
    .filter(r => r.avgLatency !== Infinity && !isNaN(r.avgLatency))
    .map(r => r.avgLatency);
  
  const avgLatency = validLatencies.length > 0 
    ? Math.round(validLatencies.reduce((sum, lat) => sum + lat, 0) / validLatencies.length)
    : Infinity;
  
  const minLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : Infinity;
  const maxLatency = validLatencies.length > 0 ? Math.max(...validLatencies) : Infinity;

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    avgLatency,
    minLatency,
    maxLatency
  };
}
