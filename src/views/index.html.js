/**
 * HTML 页面生成器 - 为 Worker 部署生成内嵌的 HTML 页面
 */

import { TEST_CONFIG, HTTP_CONFIG } from '../config/constants.js';

/**
 * 生成并返回 HTML 页面
 * @returns {Response} - Cloudflare Response 对象
 */
export function serveHtmlPage() {
  const html = generateHtmlContent();
  
  return new Response(html, {
    headers: HTTP_CONFIG.HEADERS.HTML,
  });
}

/**
 * 生成 HTML 内容
 * @returns {string} - 完整的 HTML 字符串
 */
function generateHtmlContent() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NAT64 网络测速工具</title>
  ${generateStyles()}
</head>
<body>
  <div class="container">
    <h1>NAT64 网络测速工具</h1>
    <p>该工具将从 Cloudflare Worker 对 <a href="https://nat64.xyz/" target="_blank">nat64.xyz</a> 上列出的所有 NAT64 服务进行延迟测试。</p>
    <button id="start-btn" disabled>开始测速</button>
    <div id="status"></div>
    <table id="results-table" style="display:none;">
      <thead>
        <tr>
          <th>供应商</th>
          <th>国家/地区</th>
          <th>NAT64 前缀</th>
          <th>状态</th>
          <th>平均延迟</th>
          <th>总延迟 (${TEST_CONFIG.LATENCY_TEST_COUNT}次)</th>
        </tr>
      </thead>
      <tbody id="results-body"></tbody>
    </table>
  </div>
  ${generateScript()}
</body>
</html>`;
}

/**
 * 生成 CSS 样式
 * @returns {string} - CSS 样式字符串
 */
function generateStyles() {
  return `<style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      margin: 2em;
      background-color: #f8f9fa;
      color: #343a40;
    }
    .container {
      max-width: 1024px;
      margin: auto;
    }
    h1 {
      color: #007bff;
      text-align: center;
      margin-bottom: 1em;
    }
    p {
      text-align: center;
      margin-bottom: 2em;
      font-size: 1.1em;
    }
    button {
      font-size: 1rem;
      padding: 12px 24px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      background-color: #007bff;
      color: white;
      transition: all 0.2s ease;
      display: block;
      margin: 0 auto 2em auto;
      min-width: 120px;
    }
    button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    button:hover:not(:disabled) {
      background-color: #0056b3;
      transform: translateY(-1px);
    }
    #status {
      margin: 20px 0;
      font-style: italic;
      color: #6c757d;
      text-align: center;
      font-size: 1.1em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
      font-size: 0.9rem;
    }
    thead {
      background-color: #343a40;
      color: white;
    }
    tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    tbody tr:hover {
      background-color: #e9ecef;
    }
    code {
      background-color: #e9ecef;
      padding: 3px 6px;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85em;
    }
    .status-success { color: #28a745; font-weight: bold; }
    .status-failed { color: #dc3545; font-weight: bold; }
    .status-testing { color: #6c757d; }
    .latency-good { color: #28a745; }
    .latency-medium { color: #ffc107; }
    .latency-poor { color: #dc3545; }
  </style>`;
}

/**
 * 生成 JavaScript 脚本
 * @returns {string} - JavaScript 脚本字符串
 */
function generateScript() {
  return `<script>
    const startBtn = document.getElementById('start-btn');
    const statusDiv = document.getElementById('status');
    const resultsTable = document.getElementById('results-table');
    const resultsBody = document.getElementById('results-body');

    let providersData = []; // 存储提供商数据

    // 页面加载时自动获取提供商列表
    async function loadProviders() {
      statusDiv.textContent = '正在从 nat64.xyz 获取提供商列表...';
      resultsTable.style.display = 'table';
      resultsBody.innerHTML = '<tr><td colspan="6"><i>正在获取提供商列表...</i></td></tr>';

      try {
        const response = await fetch('/api/prefixes');
        if (!response.ok) throw new Error('获取前缀列表失败: ' + response.statusText);
        providersData = await response.json();
        if(Object.keys(providersData).length === 0) throw new Error('未能解析到任何提供商信息。');

        // 显示提供商列表
        displayProviders();

        // 计算总的提供商数量和前缀数量
        const providerCount = Object.keys(providersData).length;
        let totalPrefixes = 0;
        for (const regions of Object.values(providersData)) {
          for (const prefixes of Object.values(regions)) {
            totalPrefixes += prefixes.length;
          }
        }

        statusDiv.textContent = \`已加载 \${providerCount} 个提供商，共 \${totalPrefixes} 个前缀，点击"开始测速"进行测试\`;
        startBtn.disabled = false;

      } catch (err) {
        statusDiv.textContent = '错误: ' + err.message;
        resultsBody.innerHTML = \`<tr><td colspan="6" style="color:red;">\${err.message}</td></tr>\`;
      }
    }

    // 显示提供商列表
    function displayProviders() {
      resultsBody.innerHTML = '';

      // 遍历新的数据结构：{供应商: {地区: [前缀数组]}}
      for (const [provider, regions] of Object.entries(providersData)) {
        for (const [region, prefixes] of Object.entries(regions)) {
          // 为每个前缀创建一行
          for (const prefix of prefixes) {
            const row = resultsBody.insertRow();
            row.innerHTML = \`
              <td>\${provider}</td>
              <td>\${region}</td>
              <td><code>\${prefix}</code></td>
              <td class="status-testing">等待测试</td>
              <td>-</td>
              <td>-</td>
            \`;
          }
        }
      }
    }

    // 格式化延迟显示
    function formatLatency(latency) {
      if (latency === Infinity || isNaN(latency)) return 'N/A';

      let className = 'latency-good';
      if (latency > 200) className = 'latency-poor';
      else if (latency > 100) className = 'latency-medium';

      return \`<span class="\${className}">\${latency} ms</span>\`;
    }

    // 并发控制器类
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

    // 开始测速
    startBtn.addEventListener('click', async () => {
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

      // 实现并发控制
      const CONCURRENT_LIMIT = ${TEST_CONFIG.CONCURRENT_LIMIT};
      const controller = new ConcurrencyController(CONCURRENT_LIMIT);

      // 为所有前缀同时创建测试任务（但受并发限制控制）
      const allTestPromises = allPrefixes.map((item, index) => {
        return controller.add(async () => {
          const { provider, region, prefix } = item;

          try {
            const response = await fetch(\`/api/test?prefix=\${encodeURIComponent(prefix)}\`);
            const result = await response.json();

            if (result.error) throw new Error(result.error);

            // 更新对应行的结果
            const targetRow = rows[index];
            const cells = targetRow.querySelectorAll('td');

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
              const successRate = \`\${result.successCount}/\${result.totalCount}\`;
              cells[5].textContent = \`\${totalLatencyText} (\${successRate})\`;
            } else {
              cells[5].textContent = totalLatencyText;
            }

          } catch (err) {
            const targetRow = rows[index];
            const cells = targetRow.querySelectorAll('td');

            cells[3].innerHTML = '<span class="status-failed">错误</span>';
            cells[4].textContent = err.message.length > 20 ? err.message.substring(0, 20) + '...' : err.message;
            cells[5].textContent = '-';
          }

          completedCount++;
          statusDiv.textContent = \`测速进度: \${completedCount}/\${totalCount} (\${Math.round(completedCount/totalCount*100)}%)\`;
        });
      });

      // 等待所有测试完成
      await Promise.all(allTestPromises);

      statusDiv.textContent = \`测速完成！共测试了 \${totalCount} 个 NAT64 前缀\`;
      startBtn.disabled = false;
      startBtn.textContent = '重新测速';
    });

    // 页面加载时自动执行
    window.addEventListener('load', loadProviders);
  </script>`;
}
