// 导入 Cloudflare Sockets API，用于建立底层TCP连接
import { connect } from 'cloudflare:sockets';

// --- 后端配置项 ---
const TEST_IPV4 = '1.1.1.1'; // 用于延迟测试的目标IPv4地址
const LATENCY_TEST_COUNT = 3; // 对每个前缀进行延迟测试的次数
// 注意：下载测试功能已移除，专注于延迟测试

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 根据请求路径进行路由
    switch (url.pathname) {
      case '/':
        // 访问根目录时，返回带有前端逻辑的HTML页面
        return serveHtmlPage();

      case '/api/prefixes':
        // API端点：获取NAT64前缀列表
        try {
          const prefixes = await getNat64ProvidersList();
          return new Response(JSON.stringify(prefixes), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

      case '/api/test':
        // API端点：对单个前缀进行测速
        const prefix = url.searchParams.get('prefix');
        if (!prefix || !prefix.includes('::/96')) {
          return new Response(JSON.stringify({ error: '无效或缺少 "prefix" 参数' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        try {
          const result = await testNat64Provider(prefix);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err) {
           return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

      default:
        return new Response('路径未找到', { status: 404 });
    }
  },
};

// =================================================================
// ===== 后端逻辑：单个提供商的测试函数 (这部分无变化)
// =================================================================

async function testNat64Provider(prefix) {
  try {
    const latencyResult = await testLatency(prefix);
    return { prefix, ...latencyResult, status: 'OK' };
  } catch (error) {
    return { prefix, status: '失败', error: error.message, avgLatency: Infinity, totalLatency: Infinity };
  }
}
async function testLatency(prefix) {
  const latencies = [];
  let totalLatency = 0;
  const targetAddress = constructNat64Address(prefix, TEST_IPV4);

  for (let i = 0; i < LATENCY_TEST_COUNT; i++) {
    const startTime = Date.now();
    try {
      // 建立HTTPS连接到1.1.1.1:443
      const socket = await connect({
        hostname: targetAddress,
        port: 443,
        secureTransport: "on" // 使用HTTPS确保连接真正建立
      });

      // 验证连接：发送简单的HTTP请求并等待响应
      const writer = socket.writable.getWriter();
      const reader = socket.readable.getReader();

      // 发送HTTP HEAD请求
      const httpRequest = 'HEAD / HTTP/1.1\r\nHost: one.one.one.one\r\nConnection: close\r\n\r\n';
      await writer.write(new TextEncoder().encode(httpRequest));
      await writer.close();

      // 读取响应以验证连接成功
      const { value } = await reader.read();
      if (!value || value.length === 0) {
        throw new Error('No response received');
      }

      // 检查是否收到HTTP响应
      const responseText = new TextDecoder().decode(value);
      if (!responseText.includes('HTTP/')) {
        throw new Error('Invalid HTTP response');
      }

      await socket.close();
      const endTime = Date.now();
      const latency = endTime - startTime;

      // 验证延迟合理性（应该大于10ms，小于5000ms）
      if (latency < 10 || latency > 5000) {
        throw new Error(`Unrealistic latency: ${latency}ms`);
      }

      latencies.push(latency);

    } catch (e) {
      // 连接失败或验证失败
      latencies.push(Infinity);
      // 不要break，继续尝试剩余的测试
    }
  }

  totalLatency = latencies.reduce((a, b) => a === Infinity ? b : (b === Infinity ? a : a + b), 0);
  const successfulPings = latencies.filter(l => l !== Infinity);

  if (successfulPings.length === 0) {
    return { avgLatency: Infinity, totalLatency: Infinity };
  }

  const avgLatency = totalLatency / successfulPings.length;
  return {
    avgLatency: Math.round(avgLatency),
    totalLatency: Math.round(totalLatency),
    successCount: successfulPings.length,
    totalCount: LATENCY_TEST_COUNT
  };
}
// 注意：testDownloadSpeed 函数已移除，专注于延迟测试功能

// =================================================================
// ===== 后端逻辑：HTML页面抓取和地址构造 (重大改进)
// =================================================================

/**
 * 抓取并解析 nat64.xyz 页面的完整提供商信息。
 * @returns {Promise<Object>} - 返回一个包含 {供应商: {地区: [前缀数组]}} 的对象
 */
async function getNat64ProvidersList() {
  const response = await fetch("https://nat64.xyz/", {
    headers: { 'User-Agent': 'Cloudflare-Worker-Nat64-Speed-Test' }
  });
  if (!response.ok) {
    throw new Error(`无法获取 nat64.xyz 页面: ${response.statusText}`);
  }

  const providersMap = {};
  const rows = [];
  let currentRow = null;
  let cellIndex = 0;

  const rewriter = new HTMLRewriter()
    .on("tbody > tr", {
      element() {
        // 开始新行时，保存上一行并创建新行
        if (currentRow && currentRow.provider && currentRow.country && currentRow.prefixes) {
          rows.push(currentRow);
        }
        currentRow = { provider: '', country: '', prefixes: '' };
        cellIndex = 0;
      }
    })
    .on("tbody > tr > td", {
      element() {
        cellIndex++;
      },
      text(text) {
        if (!currentRow) return;

        // 根据单元格位置收集数据
        if (cellIndex === 1) {
          // 第1列：供应商名称，清理HTML标签
          currentRow.provider += text.text;
        } else if (cellIndex === 2) {
          // 第2列：国家/地区
          currentRow.country += text.text;
        } else if (cellIndex === 4) {
          // 第4列：NAT64前缀
          currentRow.prefixes += text.text;
        }
      }
    })
    .on("tbody > tr > td:nth-child(4) > br", {
      element() {
        // 处理 <br> 标签，用作前缀分隔符
        if (currentRow) {
          currentRow.prefixes += '|BR|';
        }
      }
    });

  await rewriter.transform(response).text();

  // 处理最后一行
  if (currentRow && currentRow.provider && currentRow.country && currentRow.prefixes) {
    rows.push(currentRow);
  }

  // 处理所有收集到的行数据，构建分层结构
  for (const row of rows) {
    // 清理供应商名称，移除HTML标签
    const cleanProvider = row.provider.trim().replace(/<[^>]*>/g, '');
    const country = row.country.trim();

    // 分割前缀并过滤有效的 NAT64 前缀
    const prefixes = row.prefixes
      .split('|BR|')
      .map(p => p.trim())
      .filter(p => p && p.includes('::/96'));

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

function constructNat64Address(prefix, ipv4) {
    const cleanedPrefix = prefix.replace(/::\/96$/, '::');
    const parts = ipv4.split('.');
    const hex = parts.map(part => parseInt(part, 10).toString(16).padStart(2, '0'));
    return `[${cleanedPrefix}${hex[0]}${hex[1]}:${hex[2]}${hex[3]}]`;
}


// =================================================================
// ===== 前端页面生成 (重大改进)
// =================================================================

function serveHtmlPage() {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NAT64 网络测速工具</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 2em; background-color: #f8f9fa; color: #343a40; }
    .container { max-width: 1024px; margin: auto; }
    h1 { color: #007bff; }
    button { font-size: 1rem; padding: 10px 15px; border-radius: 5px; border: none; cursor: pointer; background-color: #007bff; color: white; transition: background-color 0.2s; }
    button:disabled { background-color: #6c757d; cursor: not-allowed; }
    button:hover:not(:disabled) { background-color: #0056b3; }
    #status { margin-top: 20px; font-style: italic; color: #6c757d; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #dee2e6; font-size: 0.9rem; }
    thead { background-color: #343a40; color: white; }
    tbody tr:nth-child(even) { background-color: #f2f2f2; }
    code { background-color: #e9ecef; padding: 2px 5px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; }
  </style>
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
          <th>总延迟 (${LATENCY_TEST_COUNT}次)</th>
        </tr>
      </thead>
      <tbody id="results-body"></tbody>
    </table>
  </div>

  <script>
    const startBtn = document.getElementById('start-btn');
    const statusDiv = document.getElementById('status');
    const resultsTable = document.getElementById('results-table');
    const resultsBody = document.getElementById('results-body');

    let providersData = []; // 存储提供商数据

    // 页面加载时自动获取提供商列表
    async function loadProviders() {
      statusDiv.textContent = '正在从 nat64.xyz 获取提供商列表...';
      resultsTable.style.display = 'table';
      resultsBody.innerHTML = '<tr><td colspan="7"><i>正在获取提供商列表...</i></td></tr>';

      try {
        const response = await fetch('/api/prefixes');
        if (!response.ok) throw new Error('获取前缀列表失败: ' + response.statusText);
        providersData = await response.json();
        if(providersData.length === 0) throw new Error('未能解析到任何提供商信息。');

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
        resultsBody.innerHTML = \`<tr><td colspan="7" style="color:red;">\${err.message}</td></tr>\`;
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
              <td>等待测试</td>
              <td>-</td>
              <td>-</td>
            \`;
          }
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
          cells[3].textContent = '测试中...';
          cells[3].style.color = '#6c757d';
          cells[4].textContent = '-';
          cells[5].textContent = '-';
        }
      });

      // 实现真正的并发控制：所有请求同时发起，但限制同时进行的数量
      const CONCURRENT_LIMIT = 16; // 增加并发数量以提高效率

      // 创建并发控制器
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
              cells[3].textContent = '成功';
              cells[3].style.color = 'green';
            } else {
              cells[3].textContent = '失败';
              cells[3].style.color = 'red';
            }

            // 显示延迟测试结果
            const latencyText = result.avgLatency === Infinity ? 'N/A' : result.avgLatency + ' ms';
            const totalLatencyText = result.totalLatency === Infinity ? 'N/A' : result.totalLatency + ' ms';

            // 如果有成功率信息，显示在总延迟中
            if (result.successCount !== undefined && result.totalCount !== undefined) {
              const successRate = `${result.successCount}/${result.totalCount}`;
              cells[5].textContent = `${totalLatencyText} (${successRate})`;
            } else {
              cells[5].textContent = totalLatencyText;
            }

            cells[4].textContent = latencyText;

          } catch (err) {
            const targetRow = rows[index];
            const cells = targetRow.querySelectorAll('td');

            cells[3].textContent = '错误';
            cells[3].style.color = 'red';
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
  </script>
</body>
</html>
  `;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}