/**
 * 测试 API 处理器 - 处理 NAT64 延迟测试请求
 */

import { testNat64Provider } from '../services/testService.js';
import { isValidNat64Prefix } from '../utils/helpers.js';
import { createJsonResponse, createErrorResponse } from '../utils/helpers.js';
import { validateMethod, getQueryParam, handleCors, addCorsHeaders } from './router.js';
import { ERROR_MESSAGES } from '../config/constants.js';

/**
 * 处理测试请求
 * @param {Request} request - Cloudflare Request 对象
 * @returns {Promise<Response>} - Cloudflare Response 对象
 */
export async function handleTestRequest(request) {
  // 处理 CORS 预检请求
  const corsResponse = handleCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  // 验证请求方法
  if (!validateMethod(request, 'GET')) {
    return addCorsHeaders(createErrorResponse('只支持 GET 请求', 405));
  }

  // 获取并验证前缀参数
  const prefix = getQueryParam(request, 'prefix');
  const validation = validatePrefixParameter(prefix);
  
  if (!validation.valid) {
    return addCorsHeaders(createErrorResponse(validation.error, 400));
  }

  try {
    console.log(`开始测试前缀: ${prefix}`);
    
    const result = await testNat64Provider(prefix);
    
    console.log(`前缀 ${prefix} 测试完成:`, {
      status: result.status,
      avgLatency: result.avgLatency,
      successCount: result.successCount
    });
    
    const response = createJsonResponse(result);
    return addCorsHeaders(response);
    
  } catch (error) {
    console.error(`测试前缀 ${prefix} 失败:`, error);
    
    const errorResponse = createErrorResponse(
      `测试失败: ${error.message}`,
      500
    );
    
    return addCorsHeaders(errorResponse);
  }
}

/**
 * 验证前缀参数
 * @param {string} prefix - 前缀参数
 * @returns {Object} - 验证结果
 */
function validatePrefixParameter(prefix) {
  if (!prefix) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_PREFIX + ' - 参数为空'
    };
  }

  if (!isValidNat64Prefix(prefix)) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_PREFIX + ' - 格式不正确'
    };
  }

  return {
    valid: true
  };
}

/**
 * 格式化测试结果
 * @param {Object} result - 原始测试结果
 * @returns {Object} - 格式化后的结果
 */
export function formatTestResult(result) {
  const formatted = {
    prefix: result.prefix,
    status: result.status,
    timestamp: new Date().toISOString()
  };

  if (result.status === 'OK') {
    formatted.latency = {
      average: result.avgLatency,
      total: result.totalLatency,
      unit: 'ms'
    };

    if (result.successCount !== undefined && result.totalCount !== undefined) {
      formatted.reliability = {
        successCount: result.successCount,
        totalCount: result.totalCount,
        successRate: Math.round((result.successCount / result.totalCount) * 100)
      };
    }
  } else {
    formatted.error = result.error || '测试失败';
  }

  return formatted;
}

/**
 * 批量测试处理器（用于未来扩展）
 * @param {Request} request - 请求对象
 * @returns {Promise<Response>} - 响应对象
 */
export async function handleBatchTestRequest(request) {
  // 处理 CORS 预检请求
  const corsResponse = handleCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  // 验证请求方法
  if (!validateMethod(request, 'POST')) {
    return addCorsHeaders(createErrorResponse('只支持 POST 请求', 405));
  }

  try {
    const body = await request.json();
    
    if (!body.prefixes || !Array.isArray(body.prefixes)) {
      return addCorsHeaders(createErrorResponse('请求体必须包含 prefixes 数组', 400));
    }

    // 验证所有前缀
    for (const prefix of body.prefixes) {
      const validation = validatePrefixParameter(prefix);
      if (!validation.valid) {
        return addCorsHeaders(createErrorResponse(
          `无效前缀 ${prefix}: ${validation.error}`,
          400
        ));
      }
    }

    // 执行批量测试
    const results = [];
    for (const prefix of body.prefixes) {
      try {
        const result = await testNat64Provider(prefix);
        results.push(formatTestResult(result));
      } catch (error) {
        results.push({
          prefix,
          status: '错误',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    const response = createJsonResponse({
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'OK').length,
        failed: results.filter(r => r.status !== 'OK').length
      }
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('批量测试失败:', error);
    
    const errorResponse = createErrorResponse(
      `批量测试失败: ${error.message}`,
      500
    );
    
    return addCorsHeaders(errorResponse);
  }
}
