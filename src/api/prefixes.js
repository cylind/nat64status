/**
 * 前缀 API 处理器 - 处理 NAT64 前缀列表请求
 */

import { getNat64ProvidersList } from '../services/nat64Service.js';
import { createJsonResponse, createErrorResponse } from '../utils/helpers.js';
import { validateMethod, handleCors, addCorsHeaders } from './router.js';

/**
 * 处理前缀列表请求
 * @param {Request} request - Cloudflare Request 对象
 * @returns {Promise<Response>} - Cloudflare Response 对象
 */
export async function handlePrefixesRequest(request) {
  // 处理 CORS 预检请求
  const corsResponse = handleCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  // 验证请求方法
  if (!validateMethod(request, 'GET')) {
    return addCorsHeaders(createErrorResponse('只支持 GET 请求', 405));
  }

  try {
    console.log('开始获取 NAT64 前缀列表...');
    
    const prefixes = await getNat64ProvidersList();
    
    console.log(`成功获取 ${Object.keys(prefixes).length} 个提供商的前缀信息`);
    
    const response = createJsonResponse(prefixes);
    return addCorsHeaders(response);
    
  } catch (error) {
    console.error('获取前缀列表失败:', error);
    
    const errorResponse = createErrorResponse(
      `获取前缀列表失败: ${error.message}`,
      500
    );
    
    return addCorsHeaders(errorResponse);
  }
}

/**
 * 验证前缀数据的完整性
 * @param {Object} prefixes - 前缀数据
 * @returns {Object} - 验证结果
 */
export function validatePrefixesData(prefixes) {
  if (!prefixes || typeof prefixes !== 'object') {
    return {
      valid: false,
      error: '前缀数据格式无效'
    };
  }

  const providerCount = Object.keys(prefixes).length;
  if (providerCount === 0) {
    return {
      valid: false,
      error: '未找到任何提供商数据'
    };
  }

  let totalPrefixes = 0;
  for (const [provider, regions] of Object.entries(prefixes)) {
    if (!regions || typeof regions !== 'object') {
      return {
        valid: false,
        error: `提供商 ${provider} 的地区数据格式无效`
      };
    }

    for (const [region, prefixList] of Object.entries(regions)) {
      if (!Array.isArray(prefixList)) {
        return {
          valid: false,
          error: `提供商 ${provider} 地区 ${region} 的前缀列表格式无效`
        };
      }
      totalPrefixes += prefixList.length;
    }
  }

  return {
    valid: true,
    stats: {
      providerCount,
      totalPrefixes
    }
  };
}
