# 快速开始指南

## 选择部署方式

### 1. Cloudflare Worker 部署（推荐）
```bash
npm install
npx wrangler login
npm run deploy
```

### 2. Cloudflare Pages 部署
```bash
# 方式一：Git 集成（推荐）
git init
git add .
git commit -m "Initial commit"
git push origin main
# 然后在 Cloudflare Dashboard 中连接仓库

# 方式二：直接部署
npm run pages:deploy
```

### 3. 单文件部署（最简单）
```bash
npx wrangler deploy _worker.js
```

## 本地开发

### Worker 开发
```bash
npm run dev
```

### Pages 开发
```bash
npm run pages:dev
```

## 配置说明

编辑 `wrangler.toml` 文件来自定义配置：
- 修改 `name` 字段设置 Worker 名称
- 添加 `routes` 配置自定义域名
- 设置 `vars` 添加环境变量

## 功能特点

- 🚀 高性能延迟测试
- 🌐 全球 NAT64 提供商支持
- 📊 详细的测试统计
- 📱 响应式设计
- 🔧 模块化架构

## 技术支持

- 查看 README.md 了解详细信息
- 查看 DEPLOYMENT.md 了解部署指南
- 查看 PROJECT_STRUCTURE.md 了解项目结构

构建时间: 2025/7/13 23:04:23
