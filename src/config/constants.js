/**
 * NAT64 延迟测试工具 - 配置常量
 */

// 测试配置
export const TEST_CONFIG = {
  // 用于延迟测试的目标IPv4地址
  IPV4_TARGET: '1.1.1.1',
  
  // 对每个前缀进行延迟测试的次数
  LATENCY_TEST_COUNT: 3,
  
  // 延迟测试的合理范围（毫秒）
  MIN_LATENCY: 10,
  MAX_LATENCY: 5000,
  
  // 并发控制
  CONCURRENT_LIMIT: 16,
  
  // 超时设置
  REQUEST_TIMEOUT: 10000, // 10秒
};

// API 配置
export const API_CONFIG = {
  // NAT64 提供商列表来源
  PROVIDERS_URL: 'https://nat64.xyz/',
  
  // User-Agent
  USER_AGENT: 'Cloudflare-Worker-Nat64-Speed-Test',
  
  // API 路径
  PATHS: {
    ROOT: '/',
    API_PREFIXES: '/api/prefixes',
    API_TEST: '/api/test',
  },
};

// HTTP 配置
export const HTTP_CONFIG = {
  // HTTPS 端口
  HTTPS_PORT: 443,
  
  // HTTP 请求模板
  HTTP_REQUEST_TEMPLATE: 'HEAD / HTTP/1.1\r\nHost: one.one.one.one\r\nConnection: close\r\n\r\n',
  
  // 响应头
  HEADERS: {
    JSON: { 'Content-Type': 'application/json' },
    HTML: { 'Content-Type': 'text/html; charset=utf-8' },
  },
};

// 错误消息
export const ERROR_MESSAGES = {
  INVALID_PREFIX: '无效或缺少 "prefix" 参数',
  FETCH_PROVIDERS_FAILED: '无法获取 nat64.xyz 页面',
  NO_RESPONSE: 'No response received',
  INVALID_HTTP_RESPONSE: 'Invalid HTTP response',
  UNREALISTIC_LATENCY: 'Unrealistic latency',
  NO_PROVIDERS_FOUND: '未能解析到任何提供商信息',
  PATH_NOT_FOUND: '路径未找到',
};

// 正则表达式
export const REGEX = {
  // NAT64 前缀格式验证
  NAT64_PREFIX: /::\/(96|128)$/,
  
  // IPv4 地址验证
  IPV4: /^(\d{1,3}\.){3}\d{1,3}$/,
  
  // HTTP 响应验证
  HTTP_RESPONSE: /HTTP\//,
};

// HTML 解析配置
export const HTML_PARSER_CONFIG = {
  // 表格行选择器
  TABLE_ROW_SELECTOR: 'tbody > tr',
  
  // 表格单元格选择器
  TABLE_CELL_SELECTOR: 'tbody > tr > td',
  
  // 前缀列的换行符选择器
  PREFIX_BR_SELECTOR: 'tbody > tr > td:nth-child(4) > br',
  
  // 分隔符
  BR_SEPARATOR: '|BR|',
  
  // 列索引
  COLUMN_INDEX: {
    PROVIDER: 1,
    COUNTRY: 2,
    PREFIX: 4,
  },
};
