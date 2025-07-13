/**
 * NAT64 延迟测试工具 - 主入口文件
 * 
 * 这是重构后的模块化版本，适用于 Cloudflare Worker 部署
 * 保持与原始 _worker.js 相同的功能，但采用更清晰的模块化架构
 */

import { handleRequest } from './api/router.js';

/**
 * Cloudflare Worker 主处理器
 * @param {Request} request - Cloudflare Request 对象
 * @param {Object} env - 环境变量
 * @param {Object} ctx - 执行上下文
 * @returns {Promise<Response>} - Cloudflare Response 对象
 */
async function fetch(request, env, ctx) {
  try {
    // 记录请求信息（仅在开发环境）
    if (env?.ENVIRONMENT === 'development') {
      console.log(`${request.method} ${request.url}`);
    }

    // 处理请求
    const response = await handleRequest(request);
    
    // 添加安全头
    return addSecurityHeaders(response);
    
  } catch (error) {
    console.error('Worker 处理错误:', error);
    
    // 返回通用错误响应
    return new Response(JSON.stringify({
      error: '服务器内部错误',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * 添加安全响应头
 * @param {Response} response - 原始响应
 * @returns {Response} - 添加了安全头的响应
 */
function addSecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);
  
  // 安全头
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('X-XSS-Protection', '1; mode=block');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP 头（针对 HTML 页面）
  if (response.headers.get('Content-Type')?.includes('text/html')) {
    newHeaders.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://nat64.xyz; " +
      "img-src 'self' data:; " +
      "font-src 'self';"
    );
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Worker 生命周期事件处理
 */
const worker = {
  fetch,
  
  // 定时任务处理器（如果需要）
  async scheduled(event, env, ctx) {
    console.log('定时任务触发:', event.scheduledTime);
    // 可以在这里添加定期清理或维护任务
  },
  
  // 邮件处理器（如果需要）
  async email(message, env, ctx) {
    console.log('收到邮件:', message.from);
    // 可以在这里添加邮件处理逻辑
  }
};

// 导出 Worker 处理器
export default worker;

// 兼容性导出（支持旧版本的 Worker 运行时）
export { fetch };
