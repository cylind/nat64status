/**
 * NAT64 延迟测试工具 - 辅助工具函数
 */

import { REGEX, ERROR_MESSAGES } from '../config/constants.js';

/**
 * 构造 NAT64 地址
 * @param {string} prefix - NAT64 前缀
 * @param {string} ipv4 - IPv4 地址
 * @returns {string} - 构造的 NAT64 地址
 */
export function constructNat64Address(prefix, ipv4) {
  if (!prefix || !ipv4) {
    throw new Error('前缀和IPv4地址不能为空');
  }

  // 验证 IPv4 地址格式
  if (!REGEX.IPV4.test(ipv4)) {
    throw new Error('无效的IPv4地址格式');
  }

  // 清理前缀，移除 ::/96 后缀
  const cleanedPrefix = prefix.replace(/::\/96$/, '::');
  
  // 将 IPv4 地址转换为十六进制
  const parts = ipv4.split('.');
  const hex = parts.map(part => {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) {
      throw new Error('IPv4地址部分超出有效范围');
    }
    return num.toString(16).padStart(2, '0');
  });

  return `[${cleanedPrefix}${hex[0]}${hex[1]}:${hex[2]}${hex[3]}]`;
}

/**
 * 验证 NAT64 前缀格式
 * @param {string} prefix - 要验证的前缀
 * @returns {boolean} - 是否为有效的 NAT64 前缀
 */
export function isValidNat64Prefix(prefix) {
  return prefix && prefix.includes('::/96');
}

/**
 * 清理 HTML 标签
 * @param {string} text - 包含 HTML 标签的文本
 * @returns {string} - 清理后的文本
 */
export function cleanHtmlTags(text) {
  return text.trim().replace(/<[^>]*>/g, '');
}

/**
 * 验证延迟值的合理性
 * @param {number} latency - 延迟值（毫秒）
 * @param {number} min - 最小合理值
 * @param {number} max - 最大合理值
 * @returns {boolean} - 延迟值是否合理
 */
export function isValidLatency(latency, min = 10, max = 5000) {
  return typeof latency === 'number' && latency >= min && latency <= max;
}

/**
 * 计算平均延迟
 * @param {number[]} latencies - 延迟数组
 * @returns {object} - 包含平均延迟和统计信息的对象
 */
export function calculateLatencyStats(latencies) {
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
 * 创建标准的 JSON 响应
 * @param {any} data - 响应数据
 * @param {number} status - HTTP 状态码
 * @param {object} headers - 额外的响应头
 * @returns {Response} - Cloudflare Response 对象
 */
export function createJsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

/**
 * 创建错误响应
 * @param {string} message - 错误消息
 * @param {number} status - HTTP 状态码
 * @returns {Response} - Cloudflare Response 对象
 */
export function createErrorResponse(message, status = 500) {
  return createJsonResponse({ error: message }, status);
}

/**
 * 延迟执行函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} - Promise 对象
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 并发控制器类
 */
export class ConcurrencyController {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async add(asyncFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        asyncFunction,
        resolve,
        reject
      });
      this.tryNext();
    });
  }

  async tryNext() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { asyncFunction, resolve, reject } = this.queue.shift();

    try {
      const result = await asyncFunction();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.tryNext();
    }
  }
}
