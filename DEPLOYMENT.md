# NAT64 延迟测试工具 - 部署指南

本文档详细说明了如何部署 NAT64 延迟测试工具的不同版本。

## 部署选项概览

| 部署方式 | 适用场景 | 优势 | 劣势 |
|---------|---------|------|------|
| Cloudflare Worker | 简单快速部署 | 全球边缘网络、低延迟 | 需要 Wrangler CLI |
| Cloudflare Pages | 静态站点 + 函数 | Git 集成、自动部署 | 需要 Git 仓库 |
| 单文件 Worker | 最简部署 | 一个文件搞定 | 代码难以维护 |

## 方式一：Cloudflare Worker 部署（推荐）

### 前提条件
- Node.js 16+ 
- Cloudflare 账户
- Wrangler CLI

### 步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **登录 Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **开发环境测试**
   ```bash
   npm run dev
   ```
   访问 `http://localhost:8787` 测试功能

4. **部署到生产环境**
   ```bash
   npm run deploy
   ```

5. **配置自定义域名（可选）**
   在 Cloudflare Dashboard 中配置路由规则

### 配置说明

编辑 `wrangler.toml` 文件：

```toml
name = "your-worker-name"
main = "src/index.js"
compatibility_date = "2024-07-01"

# 自定义域名
routes = [
  { pattern = "nat64-test.yourdomain.com/*", zone_name = "yourdomain.com" }
]

# 环境变量
[vars]
ENVIRONMENT = "production"
```

## 方式二：Cloudflare Pages 部署

### 通过 Git 集成（推荐）

1. **推送代码到 Git 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/nat64-test.git
   git push -u origin main
   ```

2. **在 Cloudflare Dashboard 中创建 Pages 项目**
   - 登录 Cloudflare Dashboard
   - 进入 Pages 部分
   - 点击 "Create a project"
   - 连接 Git 仓库
   - 设置构建配置：
     - 构建命令：`npm run build`（如果需要）
     - 输出目录：`public`
     - 环境变量：无需特殊配置

3. **自动部署**
   每次推送到主分支都会自动触发部署

### 通过 Wrangler CLI

1. **本地开发**
   ```bash
   npm run pages:dev
   ```

2. **部署**
   ```bash
   npm run pages:deploy
   ```

## 方式三：单文件 Worker 部署

如果您喜欢简单的单文件部署：

```bash
npx wrangler deploy _worker.js
```

这将直接部署原始的单文件版本。

## 环境配置

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 或者启动 Pages 开发服务器
npm run pages:dev
```

### 生产环境

确保在 `wrangler.toml` 中正确配置：

```toml
[env.production]
name = "nat64-latency-test-prod"
vars = { ENVIRONMENT = "production" }

[env.development]
name = "nat64-latency-test-dev"
vars = { ENVIRONMENT = "development" }
```

## 性能优化建议

### 1. 缓存配置

在 Cloudflare Dashboard 中配置缓存规则：
- 静态资源（CSS、JS）：缓存 1 年
- API 响应：缓存 5 分钟
- HTML 页面：缓存 1 小时

### 2. 安全设置

- 启用 HTTPS
- 配置 CSP 头（已在代码中实现）
- 启用 Bot Fight Mode

### 3. 监控和分析

- 启用 Cloudflare Analytics
- 配置 Real User Monitoring (RUM)
- 设置告警规则

## 故障排除

### 常见问题

1. **部署失败：权限错误**
   ```bash
   npx wrangler login
   ```

2. **模块导入错误**
   确保 `package.json` 中有 `"type": "module"`

3. **API 调用失败**
   检查 CORS 设置和网络连接

4. **性能问题**
   - 调整并发限制
   - 检查目标服务器状态
   - 优化测试逻辑

### 调试技巧

1. **查看日志**
   ```bash
   npx wrangler tail
   ```

2. **本地调试**
   ```bash
   npm run dev
   ```
   使用浏览器开发者工具检查网络请求

3. **测试 API**
   ```bash
   curl https://your-worker.your-subdomain.workers.dev/api/prefixes
   ```

## 更新和维护

### 更新代码

1. **Worker 部署**
   ```bash
   git pull
   npm run deploy
   ```

2. **Pages 部署**
   推送到 Git 仓库即可自动更新

### 监控健康状态

定期检查：
- API 响应时间
- 错误率
- 用户反馈

### 备份和恢复

- 代码备份：Git 仓库
- 配置备份：导出 `wrangler.toml`
- 数据备份：无需（无状态应用）

## 成本估算

### Cloudflare Worker
- 免费额度：100,000 请求/天
- 付费计划：$5/月起，1000 万请求

### Cloudflare Pages
- 免费额度：500 次构建/月
- 付费计划：$20/月起，5000 次构建

### 建议
对于大多数用户，免费额度已经足够使用。

## 技术支持

如果遇到问题：
1. 查看本文档的故障排除部分
2. 检查 Cloudflare 状态页面
3. 查看项目 GitHub Issues
4. 联系技术支持
