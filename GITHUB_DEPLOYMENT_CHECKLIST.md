# GitHub + Cloudflare Pages 部署检查清单

## 📋 部署前检查清单

### ✅ 代码准备
- [ ] 所有代码已提交并推送到 GitHub
- [ ] `.gitignore` 文件已配置
- [ ] `package.json` 中 `"type": "module"` 已设置
- [ ] 所有必要文件都存在：
  - [ ] `public/index.html`
  - [ ] `public/css/styles.css`
  - [ ] `public/js/app.js`
  - [ ] `functions/api/prefixes.js`
  - [ ] `functions/api/test.js`

### ✅ GitHub 仓库设置
- [ ] 仓库已创建并设为 Public（推荐）
- [ ] 代码已推送到 `main` 分支
- [ ] README.md 文件内容完整
- [ ] 仓库描述已填写

## 🚀 Cloudflare Pages 配置步骤

### 第一步：连接 GitHub
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择 "Pages" → "Create a project"
3. 选择 "Connect to Git" → "GitHub"
4. 授权 Cloudflare 访问 GitHub

### 第二步：选择仓库
- 仓库名称：`nat64-latency-test`
- 点击 "Begin setup"

### 第三步：构建配置

#### 🔧 基本设置
```
Project name: nat64-latency-test
Production branch: main
```

#### 🔧 构建设置
```
Framework preset: None
Build command: (留空 - 无需构建)
Build output directory: public
Root directory: (留空)
```

**重要说明**：在我们的项目中，`public/` 目录包含的是静态源文件（不是构建输出），因此：
- ✅ `public/` 目录已包含在 Git 仓库中
- ✅ 无需构建命令，直接部署静态文件
- ✅ Cloudflare Pages 会直接使用 `public/` 中的文件

#### 🔧 环境变量（可选）
```
NODE_VERSION: 18
```

### 第四步：高级设置
```
Compatibility date: 2024-07-01
Compatibility flags: nodejs_compat (可选)
```

## 📝 详细配置参数

### Cloudflare Pages 设置界面参数

| 设置项 | 值 | 说明 |
|--------|-----|------|
| Project name | `nat64-latency-test` | 项目名称，可自定义 |
| Production branch | `main` | 生产分支 |
| Preview branches | `All branches` | 预览分支设置 |
| Build command | 留空 | 不需要构建命令 |
| Build output directory | `public` | 静态文件目录 |
| Root directory | 留空 | 使用仓库根目录 |

### Functions 配置（自动检测）

Pages 会自动识别以下文件：
- `functions/api/prefixes.js` → 路由：`/api/prefixes`
- `functions/api/test.js` → 路由：`/api/test`

## 🔍 部署后验证

### 1. 基本功能测试
- [ ] 网站可以正常访问
- [ ] 页面样式正确显示
- [ ] "开始测速" 按钮可以点击

### 2. API 功能测试
- [ ] `/api/prefixes` 返回前缀列表
- [ ] `/api/test?prefix=xxx` 可以执行测试
- [ ] CORS 头正确设置

### 3. 性能测试
- [ ] 页面加载速度正常
- [ ] API 响应时间合理
- [ ] 并发测试功能正常

## 🐛 常见问题解决

### 问题 1：部署失败
**症状**：构建过程中出现错误
**解决方案**：
1. 检查 `package.json` 中的 `"type": "module"`
2. 确认所有文件路径正确
3. 查看部署日志中的具体错误

### 问题 2：Functions 不工作
**症状**：API 端点返回 404
**解决方案**：
1. 确认 `functions/api/` 目录结构
2. 检查函数导出格式：`export async function onRequest`
3. 查看 Functions 日志

### 问题 3：CORS 错误
**症状**：前端无法调用 API
**解决方案**：
1. 检查 Functions 中的 CORS 头
2. 确认 OPTIONS 请求处理
3. 验证 Access-Control-Allow-Origin 设置

### 问题 4：静态文件 404
**症状**：CSS/JS 文件无法加载
**解决方案**：
1. 确认 `public/` 目录结构
2. 检查 HTML 中的文件路径
3. 验证构建输出目录设置

## 📊 监控和优化

### 部署后设置
1. **自定义域名**（可选）
   - 在 Pages 设置中添加自定义域名
   - 配置 DNS 记录

2. **缓存优化**
   - 静态资源：1 年缓存
   - API 响应：5 分钟缓存
   - HTML 页面：1 小时缓存

3. **安全设置**
   - 启用 "Always Use HTTPS"
   - 配置 Security Level
   - 启用 Bot Fight Mode

4. **性能监控**
   - 启用 Web Analytics
   - 配置 Real User Monitoring
   - 设置告警规则

## 🔄 持续部署

### 自动部署流程
```bash
# 修改代码
git add .
git commit -m "描述您的修改"
git push origin main
# Cloudflare Pages 会自动部署
```

### 预览部署
```bash
# 创建功能分支
git checkout -b feature/new-feature
# 修改代码并推送
git push origin feature/new-feature
# 会创建预览部署链接
```

## 📞 获取帮助

如果遇到问题：
1. 查看 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
2. 检查部署日志和错误信息
3. 查看本项目的其他文档：
   - `README.md` - 项目概述
   - `DEPLOYMENT.md` - 详细部署指南
   - `PROJECT_STRUCTURE.md` - 项目结构说明

## 🎉 部署成功！

部署成功后，您将获得：
- 一个全球 CDN 加速的网站
- 自动 HTTPS 证书
- 无限带宽和请求
- 自动部署和预览功能

享受您的 NAT64 延迟测试工具吧！🚀
