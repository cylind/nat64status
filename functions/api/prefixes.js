/**
 * Cloudflare Pages Function - 前缀 API
 * 
 * 这个文件为 Cloudflare Pages 部署提供 NAT64 前缀获取 API
 */

// 导入 Cloudflare Sockets API
import { connect } from 'cloudflare:sockets';

// 配置常量
const API_CONFIG = {
  PROVIDERS_URL: 'https://nat64.xyz/',
  USER_AGENT: 'Cloudflare-Pages-Nat64-Speed-Test',
};

const HTML_PARSER_CONFIG = {
  TABLE_ROW_SELECTOR: 'tbody > tr',
  TABLE_CELL_SELECTOR: 'tbody > tr > td',
  PREFIX_BR_SELECTOR: 'tbody > tr > td:nth-child(4) > br',
  BR_SEPARATOR: '|BR|',
  COLUMN_INDEX: {
    PROVIDER: 1,
    COUNTRY: 2,
    PREFIX: 4,
  },
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

  try {
    console.log('开始获取 NAT64 前缀列表...');
    
    const prefixes = await getNat64ProvidersList();
    
    console.log(`成功获取 ${Object.keys(prefixes).length} 个提供商的前缀信息`);
    
    return createJsonResponse(prefixes);
    
  } catch (error) {
    console.error('获取前缀列表失败:', error);
    return createErrorResponse(`获取前缀列表失败: ${error.message}`, 500);
  }
}

/**
 * 获取并解析 NAT64 提供商列表
 */
async function getNat64ProvidersList() {
  try {
    const response = await fetch(API_CONFIG.PROVIDERS_URL, {
      headers: { 'User-Agent': API_CONFIG.USER_AGENT }
    });

    if (!response.ok) {
      throw new Error(`无法获取 nat64.xyz 页面: ${response.statusText}`);
    }

    const providersMap = await parseProvidersHtml(response);
    
    if (Object.keys(providersMap).length === 0) {
      throw new Error('未能解析到任何提供商信息');
    }

    return providersMap;
  } catch (error) {
    console.error('获取 NAT64 提供商列表失败:', error);
    throw error;
  }
}

/**
 * 解析 HTML 页面获取提供商信息
 */
async function parseProvidersHtml(response) {
  const providersMap = {};
  const rows = [];
  let currentRow = null;
  let cellIndex = 0;

  const rewriter = new HTMLRewriter()
    .on(HTML_PARSER_CONFIG.TABLE_ROW_SELECTOR, {
      element() {
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

        const { PROVIDER, COUNTRY, PREFIX } = HTML_PARSER_CONFIG.COLUMN_INDEX;
        
        if (cellIndex === PROVIDER) {
          currentRow.provider += text.text;
        } else if (cellIndex === COUNTRY) {
          currentRow.country += text.text;
        } else if (cellIndex === PREFIX) {
          currentRow.prefixes += text.text;
        }
      }
    })
    .on(HTML_PARSER_CONFIG.PREFIX_BR_SELECTOR, {
      element() {
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

  // 处理所有收集到的行数据
  return processRowsData(rows);
}

/**
 * 验证行数据是否有效
 */
function isValidRowData(row) {
  return row && row.provider && row.country && row.prefixes;
}

/**
 * 处理行数据，构建提供商映射
 */
function processRowsData(rows) {
  const providersMap = {};

  for (const row of rows) {
    const cleanProvider = row.provider.trim().replace(/<[^>]*>/g, '');
    const country = row.country.trim();

    const prefixes = row.prefixes
      .split(HTML_PARSER_CONFIG.BR_SEPARATOR)
      .map(p => p.trim())
      .filter(p => p && p.includes('::/96'));

    if (prefixes.length > 0) {
      if (!providersMap[cleanProvider]) {
        providersMap[cleanProvider] = {};
      }
      providersMap[cleanProvider][country] = prefixes;
    }
  }

  return providersMap;
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
