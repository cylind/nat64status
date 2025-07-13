/**
 * NAT64 服务 - 处理 NAT64 提供商信息获取和解析
 */

import { API_CONFIG, HTML_PARSER_CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { cleanHtmlTags, isValidNat64Prefix } from '../utils/helpers.js';

/**
 * 获取并解析 NAT64 提供商列表
 * @returns {Promise<Object>} - 返回一个包含 {供应商: {地区: [前缀数组]}} 的对象
 */
export async function getNat64ProvidersList() {
  try {
    const response = await fetch(API_CONFIG.PROVIDERS_URL, {
      headers: { 'User-Agent': API_CONFIG.USER_AGENT }
    });

    if (!response.ok) {
      throw new Error(`${ERROR_MESSAGES.FETCH_PROVIDERS_FAILED}: ${response.statusText}`);
    }

    const providersMap = await parseProvidersHtml(response);
    
    if (Object.keys(providersMap).length === 0) {
      throw new Error(ERROR_MESSAGES.NO_PROVIDERS_FOUND);
    }

    return providersMap;
  } catch (error) {
    console.error('获取 NAT64 提供商列表失败:', error);
    throw error;
  }
}

/**
 * 解析 HTML 页面获取提供商信息
 * @param {Response} response - fetch 响应对象
 * @returns {Promise<Object>} - 解析后的提供商数据
 */
async function parseProvidersHtml(response) {
  const providersMap = {};
  const rows = [];
  let currentRow = null;
  let cellIndex = 0;

  const rewriter = new HTMLRewriter()
    .on(HTML_PARSER_CONFIG.TABLE_ROW_SELECTOR, {
      element() {
        // 开始新行时，保存上一行并创建新行
        if (currentRow && isValidRowData(currentRow)) {
          rows.push(currentRow);
        }
        currentRow = { provider: '', country: '', prefixes: '' };
        cellIndex = 0;
      }
    })
    .on(HTML_PARSER_CONFIG.TABLE_CELL_SELECTOR, {
      element() {
        cellIndex++;
      },
      text(text) {
        if (!currentRow) return;

        // 根据单元格位置收集数据
        const { PROVIDER, COUNTRY, PREFIX } = HTML_PARSER_CONFIG.COLUMN_INDEX;
        
        if (cellIndex === PROVIDER) {
          // 第1列：供应商名称
          currentRow.provider += text.text;
        } else if (cellIndex === COUNTRY) {
          // 第2列：国家/地区
          currentRow.country += text.text;
        } else if (cellIndex === PREFIX) {
          // 第4列：NAT64前缀
          currentRow.prefixes += text.text;
        }
      }
    })
    .on(HTML_PARSER_CONFIG.PREFIX_BR_SELECTOR, {
      element() {
        // 处理 <br> 标签，用作前缀分隔符
        if (currentRow) {
          currentRow.prefixes += HTML_PARSER_CONFIG.BR_SEPARATOR;
        }
      }
    });

  await rewriter.transform(response).text();

  // 处理最后一行
  if (currentRow && isValidRowData(currentRow)) {
    rows.push(currentRow);
  }

  // 处理所有收集到的行数据，构建分层结构
  return processRowsData(rows);
}

/**
 * 验证行数据是否有效
 * @param {Object} row - 行数据对象
 * @returns {boolean} - 是否有效
 */
function isValidRowData(row) {
  return row && row.provider && row.country && row.prefixes;
}

/**
 * 处理行数据，构建提供商映射
 * @param {Array} rows - 行数据数组
 * @returns {Object} - 提供商映射对象
 */
function processRowsData(rows) {
  const providersMap = {};

  for (const row of rows) {
    // 清理供应商名称，移除HTML标签
    const cleanProvider = cleanHtmlTags(row.provider);
    const country = row.country.trim();

    // 分割前缀并过滤有效的 NAT64 前缀
    const prefixes = row.prefixes
      .split(HTML_PARSER_CONFIG.BR_SEPARATOR)
      .map(p => p.trim())
      .filter(p => isValidNat64Prefix(p));

    if (prefixes.length > 0) {
      // 如果供应商不存在，创建新条目
      if (!providersMap[cleanProvider]) {
        providersMap[cleanProvider] = {};
      }

      // 添加地区和前缀
      providersMap[cleanProvider][country] = prefixes;
    }
  }

  return providersMap;
}

/**
 * 获取所有前缀的扁平化列表
 * @param {Object} providersMap - 提供商映射对象
 * @returns {Array} - 包含所有前缀信息的数组
 */
export function flattenProvidersPrefixes(providersMap) {
  const allPrefixes = [];
  
  for (const [provider, regions] of Object.entries(providersMap)) {
    for (const [region, prefixes] of Object.entries(regions)) {
      for (const prefix of prefixes) {
        allPrefixes.push({ provider, region, prefix });
      }
    }
  }
  
  return allPrefixes;
}

/**
 * 统计提供商和前缀数量
 * @param {Object} providersMap - 提供商映射对象
 * @returns {Object} - 统计信息
 */
export function getProvidersStats(providersMap) {
  const providerCount = Object.keys(providersMap).length;
  let totalPrefixes = 0;
  let totalRegions = 0;

  for (const regions of Object.values(providersMap)) {
    totalRegions += Object.keys(regions).length;
    for (const prefixes of Object.values(regions)) {
      totalPrefixes += prefixes.length;
    }
  }

  return {
    providerCount,
    totalRegions,
    totalPrefixes
  };
}
