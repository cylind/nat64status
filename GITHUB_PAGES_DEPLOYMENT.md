# GitHub + Cloudflare Pages 部署指南

## 第一步：上传到 GitHub

### 1. 初始化 Git 仓库
```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: NAT64 latency test tool"
```

### 2. 创建 GitHub 仓库
1. 登录 GitHub
2. 点击右上角 "+" → "New repository"
3. 填写仓库信息：
   - Repository name: `nat64-latency-test`
   - Description: `NAT64 网络延迟测试工具`
   - 选择 Public（推荐）或 Private
   - 不要勾选 "Add a README file"（我们已经有了）

### 3. 推送代码到 GitHub
```bash
# 添加远程仓库（替换为您的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/nat64-latency-test.git

# 推送代码
git branch -M main
git push -u origin main
```

## 第二步：Cloudflare Pages 设置

### 1. 登录 Cloudflare Dashboard
1. 访问 https://dash.cloudflare.com/
2. 登录您的 Cloudflare 账户
3. 在左侧菜单中选择 "Pages"

### 2. 创建新的 Pages 项目
1. 点击 "Create a project"
2. 选择 "Connect to Git"
3. 选择 "GitHub"
4. 授权 Cloudflare 访问您的 GitHub 账户

### 3. 选择仓库
1. 在仓库列表中找到 `nat64-latency-test`
2. 点击 "Begin setup"

### 4. 配置构建设置

#### 基本设置
- **Project name**: `nat64-latency-test`（或您喜欢的名称）
- **Production branch**: `main`

#### 构建设置
- **Framework preset**: `None`（选择无框架）
- **Build command**: 留空（不需要构建命令）
- **Build output directory**: `public`
- **Root directory**: `/`（项目根目录）

#### 环境变量
暂时不需要设置环境变量，保持默认即可。

### 5. 高级设置（可选）

#### 兼容性设置
- **Compatibility date**: `2024-07-01`
- **Compatibility flags**: 可以添加 `nodejs_compat`

#### 函数设置
- **Functions directory**: `functions`（自动检测）
- **Pages Functions compatibility**: 启用

## 第三步：部署配置详解

### 完整的构建配置示例

```yaml
# 在 Cloudflare Pages 设置页面中的配置
Project name: nat64-latency-test
Production branch: main
Preview branches: All branches
Build command: (留空)
Build output directory: public
Root directory: (留空，使用根目录)

# 环境变量（如果需要）
NODE_VERSION: 18
```

### Pages Functions 自动配置

Cloudflare Pages 会自动识别 `functions/` 目录下的文件：
- `functions/api/prefixes.js` → `/api/prefixes`
- `functions/api/test.js` → `/api/test`

### 自定义域名设置（可选）

1. 在 Pages 项目设置中点击 "Custom domains"
2. 点击 "Set up a custom domain"
3. 输入您的域名（如 `nat64-test.yourdomain.com`）
4. 按照提示配置 DNS 记录

## 第四步：验证部署

### 1. 检查部署状态
1. 在 Cloudflare Pages Dashboard 中查看部署状态
2. 等待部署完成（通常 1-3 分钟）
3. 点击生成的 URL 访问网站

### 2. 测试功能
1. 访问主页，检查界面是否正常显示
2. 点击 "开始测速" 按钮
3. 检查 API 是否正常工作：
   - `/api/prefixes` - 获取前缀列表
   - `/api/test?prefix=xxx` - 测试单个前缀

### 3. 检查 Functions
在浏览器开发者工具中查看网络请求：
- 确认 API 请求返回正确的数据
- 检查响应头是否包含 CORS 设置

## 第五步：持续部署

### 自动部署
每次推送代码到 `main` 分支都会自动触发部署：

```bash
# 修改代码后
git add .
git commit -m "Update: 描述您的修改"
git push origin main
```

### 预览部署
推送到其他分支会创建预览部署：

```bash
# 创建功能分支
git checkout -b feature/new-feature
# 修改代码...
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

## 故障排除

### 常见问题

#### 1. 部署失败
**问题**: 构建过程中出错
**解决**: 
- 检查 `package.json` 中的 `"type": "module"`
- 确保所有文件路径正确
- 查看部署日志中的具体错误信息

#### 2. Functions 不工作
**问题**: API 端点返回 404
**解决**:
- 确认 `functions/api/` 目录结构正确
- 检查函数文件中的 `export async function onRequest`
- 查看 Functions 日志

#### 3. CORS 错误
**问题**: 前端无法调用 API
**解决**:
- 检查 Functions 中的 CORS 头设置
- 确认 OPTIONS 请求处理正确

#### 4. 静态文件不加载
**问题**: CSS/JS 文件 404
**解决**:
- 确认 `public/` 目录结构正确
- 检查 HTML 中的文件路径

### 调试技巧

#### 1. 查看部署日志
在 Cloudflare Pages Dashboard 中：
1. 选择您的项目
2. 点击 "View details" 查看部署详情
3. 查看构建日志和错误信息

#### 2. 实时日志
```bash
# 查看 Functions 实时日志
npx wrangler pages deployment tail
```

#### 3. 本地测试
```bash
# 本地运行 Pages 环境
npm run pages:dev
```

## 性能优化建议

### 1. 缓存设置
在 Cloudflare Dashboard 中配置缓存规则：
- 静态资源：缓存 1 年
- API 响应：缓存 5 分钟
- HTML 页面：缓存 1 小时

### 2. 安全设置
- 启用 "Always Use HTTPS"
- 配置 Security Level
- 启用 Bot Fight Mode

### 3. 性能监控
- 启用 Web Analytics
- 配置 Real User Monitoring
- 设置性能告警

## 成本说明

### Cloudflare Pages 免费额度
- **构建**: 500 次/月
- **带宽**: 无限制
- **请求**: 100,000 次/天
- **Functions**: 100,000 次/天

### 超出免费额度
- **构建**: $1/500 次额外构建
- **Functions**: $0.50/百万次请求

对于大多数用户，免费额度完全够用。

## 下一步

部署成功后，您可以：
1. 配置自定义域名
2. 设置监控和告警
3. 优化性能和安全设置
4. 添加更多功能特性

如果遇到任何问题，请查看 Cloudflare Pages 文档或联系技术支持。
