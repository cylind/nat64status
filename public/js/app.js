/**
 * NAT64 网络测速工具 - 前端 JavaScript
 */

// 配置常量
const CONFIG = {
  LATENCY_TEST_COUNT: 3,
  CONCURRENT_LIMIT: 16,
  API_ENDPOINTS: {
    PREFIXES: '/api/prefixes',
    TEST: '/api/test'
  }
};

// DOM 元素
const startBtn = document.getElementById('start-btn');
const statusDiv = document.getElementById('status');
const resultsTable = document.getElementById('results-table');
const resultsBody = document.getElementById('results-body');

// 全局变量
let providersData = {};

/**
 * 页面加载时自动获取提供商列表
 */
async function loadProviders() {
  statusDiv.textContent = '正在从 nat64.xyz 获取提供商列表...';
  resultsTable.style.display = 'table';
  resultsBody.innerHTML = '<tr><td colspan="6"><i>正在获取提供商列表...</i></td></tr>';

  try {
    const response = await fetch(CONFIG.API_ENDPOINTS.PREFIXES);
    if (!response.ok) {
      throw new Error('获取前缀列表失败: ' + response.statusText);
    }
    
    providersData = await response.json();
    
    if (Object.keys(providersData).length === 0) {
      throw new Error('未能解析到任何提供商信息。');
    }

    // 显示提供商列表
    displayProviders();

    // 计算总的提供商数量和前缀数量
    const stats = calculateStats(providersData);
    statusDiv.textContent = `已加载 ${stats.providerCount} 个提供商，共 ${stats.totalPrefixes} 个前缀，点击"开始测速"进行测试`;
    startBtn.disabled = false;

  } catch (err) {
    console.error('加载提供商列表失败:', err);
    statusDiv.textContent = '错误: ' + err.message;
    resultsBody.innerHTML = `<tr><td colspan="6" style="color:red;">${err.message}</td></tr>`;
  }
}

/**
 * 计算统计信息
 */
function calculateStats(data) {
  const providerCount = Object.keys(data).length;
  let totalPrefixes = 0;
  
  for (const regions of Object.values(data)) {
    for (const prefixes of Object.values(regions)) {
      totalPrefixes += prefixes.length;
    }
  }
  
  return { providerCount, totalPrefixes };
}

/**
 * 显示提供商列表
 */
function displayProviders() {
  resultsBody.innerHTML = '';

  // 遍历数据结构：{供应商: {地区: [前缀数组]}}
  for (const [provider, regions] of Object.entries(providersData)) {
    for (const [region, prefixes] of Object.entries(regions)) {
      // 为每个前缀创建一行
      for (const prefix of prefixes) {
        const row = resultsBody.insertRow();
        row.innerHTML = `
          <td>${escapeHtml(provider)}</td>
          <td>${escapeHtml(region)}</td>
          <td><code>${escapeHtml(prefix)}</code></td>
          <td class="status-testing">等待测试</td>
          <td>-</td>
          <td>-</td>
        `;
      }
    }
  }
}

/**
 * 转义 HTML 字符
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 格式化延迟显示
 */
function formatLatency(latency) {
  if (latency === Infinity || isNaN(latency)) return 'N/A';
  
  let className = 'latency-good';
  if (latency > 200) className = 'latency-poor';
  else if (latency > 100) className = 'latency-medium';
  
  return `<span class="${className}">${latency} ms</span>`;
}

/**
 * 并发控制器类
 */
class ConcurrencyController {
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

/**
 * 执行单个前缀测试
 */
async function testSinglePrefix(prefix) {
  const response = await fetch(`${CONFIG.API_ENDPOINTS.TEST}?prefix=${encodeURIComponent(prefix)}`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return result;
}

/**
 * 更新测试结果显示
 */
function updateTestResult(row, result) {
  const cells = row.querySelectorAll('td');
  
  if (result.status === 'OK') {
    cells[3].innerHTML = '<span class="status-success">成功</span>';
  } else {
    cells[3].innerHTML = '<span class="status-failed">失败</span>';
  }

  // 显示延迟测试结果
  cells[4].innerHTML = formatLatency(result.avgLatency);

  const totalLatencyText = result.totalLatency === Infinity ? 'N/A' : result.totalLatency + ' ms';

  // 如果有成功率信息，显示在总延迟中
  if (result.successCount !== undefined && result.totalCount !== undefined) {
    const successRate = `${result.successCount}/${result.totalCount}`;
    cells[5].textContent = `${totalLatencyText} (${successRate})`;
  } else {
    cells[5].textContent = totalLatencyText;
  }
}

/**
 * 更新错误结果显示
 */
function updateErrorResult(row, error) {
  const cells = row.querySelectorAll('td');

  cells[3].innerHTML = '<span class="status-failed">错误</span>';
  cells[4].textContent = error.message.length > 20 ?
    error.message.substring(0, 20) + '...' : error.message;
  cells[5].textContent = '-';
}

/**
 * 开始测速主函数
 */
async function startSpeedTest() {
  startBtn.disabled = true;
  startBtn.textContent = '测速中...';

  // 收集所有需要测试的前缀
  const allPrefixes = [];
  for (const [provider, regions] of Object.entries(providersData)) {
    for (const [region, prefixes] of Object.entries(regions)) {
      for (const prefix of prefixes) {
        allPrefixes.push({ provider, region, prefix });
      }
    }
  }

  let completedCount = 0;
  const totalCount = allPrefixes.length;

  // 重置所有行状态为"测试中"
  const rows = resultsBody.querySelectorAll('tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) {
      cells[3].innerHTML = '<span class="status-testing">测试中...</span>';
      cells[4].textContent = '-';
      cells[5].textContent = '-';
    }
  });

  // 创建并发控制器
  const controller = new ConcurrencyController(CONFIG.CONCURRENT_LIMIT);

  // 为所有前缀创建测试任务
  const allTestPromises = allPrefixes.map((item, index) => {
    return controller.add(async () => {
      const { prefix } = item;

      try {
        const result = await testSinglePrefix(prefix);
        updateTestResult(rows[index], result);
      } catch (error) {
        console.error(`测试前缀 ${prefix} 失败:`, error);
        updateErrorResult(rows[index], error);
      }

      completedCount++;
      const progress = Math.round((completedCount / totalCount) * 100);
      statusDiv.textContent = `测速进度: ${completedCount}/${totalCount} (${progress}%)`;
    });
  });

  try {
    // 等待所有测试完成
    await Promise.all(allTestPromises);

    // 计算最终统计
    const stats = calculateFinalStats(rows);
    statusDiv.textContent = `测速完成！共测试了 ${totalCount} 个 NAT64 前缀，成功 ${stats.successful} 个，失败 ${stats.failed} 个`;

  } catch (error) {
    console.error('测速过程中发生错误:', error);
    statusDiv.textContent = `测速过程中发生错误: ${error.message}`;
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = '重新测速';
  }
}

/**
 * 计算最终统计信息
 */
function calculateFinalStats(rows) {
  let successful = 0;
  let failed = 0;

  rows.forEach(row => {
    const statusCell = row.querySelector('td:nth-child(4)');
    if (statusCell) {
      const statusText = statusCell.textContent.trim();
      if (statusText === '成功') {
        successful++;
      } else if (statusText === '失败' || statusText === '错误') {
        failed++;
      }
    }
  });

  return { successful, failed };
}

/**
 * 初始化事件监听器
 */
function initializeEventListeners() {
  // 开始测速按钮事件
  startBtn.addEventListener('click', startSpeedTest);

  // 键盘快捷键支持
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !startBtn.disabled) {
      startSpeedTest();
    }
  });
}

/**
 * 页面初始化
 */
function initialize() {
  console.log('NAT64 网络测速工具初始化...');
  initializeEventListeners();
  loadProviders();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
