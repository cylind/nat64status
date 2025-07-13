/**
 * API 路由器 - 处理请求路由和分发
 */

import { API_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { createErrorResponse } from '../utils/helpers.js';
import { handlePrefixesRequest } from './prefixes.js';
import { handleTestRequest } from './test.js';
import { serveHtmlPage } from '../views/index.html.js';

/**
 * 主路由处理器
 * @param {Request} request - Cloudflare Request 对象
 * @returns {Promise<Response>} - Cloudflare Response 对象
 */
export async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // 根据请求路径进行路由
    switch (pathname) {
      case API_CONFIG.PATHS.ROOT:
        // 访问根目录时，返回HTML页面
        return await serveHtmlPage();

      case API_CONFIG.PATHS.API_PREFIXES:
        // API端点：获取NAT64前缀列表
        return await handlePrefixesRequest(request);

      case API_CONFIG.PATHS.API_TEST:
        // API端点：对单个前缀进行测速
        return await handleTestRequest(request);

      default:
        return createErrorResponse(ERROR_MESSAGES.PATH_NOT_FOUND, 404);
    }
  } catch (error) {
    console.error('路由处理错误:', error);
    return createErrorResponse(error.message, 500);
  }
}

/**
 * 验证请求方法
 * @param {Request} request - 请求对象
 * @param {string|Array} allowedMethods - 允许的HTTP方法
 * @returns {boolean} - 是否为允许的方法
 */
export function validateMethod(request, allowedMethods) {
  const methods = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];
  return methods.includes(request.method);
}

/**
 * 获取查询参数
 * @param {Request} request - 请求对象
 * @param {string} paramName - 参数名
 * @returns {string|null} - 参数值
 */
export function getQueryParam(request, paramName) {
  const url = new URL(request.url);
  return url.searchParams.get(paramName);
}

/**
 * 验证必需的查询参数
 * @param {Request} request - 请求对象
 * @param {Array} requiredParams - 必需参数列表
 * @returns {Object} - 验证结果 {valid: boolean, missing: Array}
 */
export function validateRequiredParams(request, requiredParams) {
  const url = new URL(request.url);
  const missing = [];

  for (const param of requiredParams) {
    if (!url.searchParams.has(param) || !url.searchParams.get(param)) {
      missing.push(param);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 处理 CORS 预检请求
 * @param {Request} request - 请求对象
 * @returns {Response|null} - CORS 响应或 null
 */
export function handleCors(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return null;
}

/**
 * 添加 CORS 头到响应
 * @param {Response} response - 原始响应
 * @returns {Response} - 添加了 CORS 头的响应
 */
export function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
