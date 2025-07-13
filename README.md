# NAT64 网络延迟测试工具

这是一个专门用于测试 NAT64 网络延迟的工具，支持 Cloudflare Worker 和 Cloudflare Pages 两种部署方式。

## 功能特点

- 🚀 **高性能**: 使用 Cloudflare 边缘网络进行测试
- 🔄 **并发测试**: 支持多个前缀同时测试，提高效率
- 📊 **详细统计**: 提供平均延迟、成功率等详细信息
- 🌐 **全球覆盖**: 自动获取 nat64.xyz 上的所有提供商
- 📱 **响应式设计**: 支持桌面和移动设备
- 🔧 **模块化架构**: 清晰的代码结构，易于维护和扩展

## 项目结构

```
nat64-latency-test/
├── _worker.js                 # 原始单文件版本（向后兼容）
├── package.json              # 项目配置
├── wrangler.toml             # Cloudflare 配置
├── README.md                 # 项目文档
├── src/                      # 源代码目录（Worker 版本）
│   ├── index.js              # 主入口文件
│   ├── config/               # 配置文件
│   │   └── constants.js      # 常量配置
│   ├── api/                  # API 路由
│   │   ├── router.js         # 路由处理
│   │   ├── prefixes.js       # 前缀获取API
│   │   └── test.js           # 测试API
│   ├── services/             # 业务逻辑
│   │   ├── nat64Service.js   # NAT64相关服务
│   │   └── testService.js    # 测试服务
│   ├── utils/                # 工具函数
│   │   └── helpers.js        # 辅助函数
│   └── views/                # 前端资源
│       └── index.html.js     # HTML模板
├── public/                   # 静态资源（Pages 版本）
│   ├── index.html           # 静态HTML
│   ├── css/
│   │   └── styles.css       # 样式文件
│   └── js/
│       └── app.js           # 前端JavaScript
└── functions/               # Cloudflare Pages Functions
    └── api/
        ├── prefixes.js      # API端点
        └── test.js          # API端点
```

## 部署方式

### 方式一：GitHub + Cloudflare Pages 部署（推荐）

这是最简单的部署方式，支持自动部署和预览功能。

#### 快速部署脚本
```bash
# Linux/macOS
./scripts/deploy-to-github.sh your-github-username

# Windows
scripts\deploy-to-github.bat your-github-username
```

#### 手动部署步骤
1. **上传到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/nat64-latency-test.git
   git push -u origin main
   ```

2. **配置 Cloudflare Pages**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 选择 Pages → Create a project → Connect to Git
   - 选择您的 GitHub 仓库
   - 构建设置：
     - Framework preset: `None`
     - Build command: 留空
     - Build output directory: `public`

详细步骤请查看：[GitHub 部署指南](GITHUB_DEPLOYMENT_CHECKLIST.md)

### 方式二：Cloudflare Worker 部署

1. **安装依赖**
   ```bash
   npm install
   ```

2. **开发环境运行**
   ```bash
   npm run dev
   ```

3. **部署到生产环境**
   ```bash
   npm run deploy
   ```

### 方式三：Cloudflare Pages 本地部署

1. **本地开发**
   ```bash
   npm run pages:dev
   ```

2. **直接部署**
   ```bash
   npm run pages:deploy
   ```

### 方式四：单文件部署

如果您更喜欢简单的单文件部署，可以直接使用 `_worker.js`：

```bash
npx wrangler deploy _worker.js
```

## 配置说明

### 测试配置

在 `src/config/constants.js` 中可以调整以下参数：

- `LATENCY_TEST_COUNT`: 每个前缀的测试次数（默认 3 次）
- `CONCURRENT_LIMIT`: 并发测试数量（默认 16 个）
- `MIN_LATENCY` / `MAX_LATENCY`: 合理延迟范围

### 环境变量

在 `wrangler.toml` 中可以设置环境变量：

```toml
[vars]
ENVIRONMENT = "production"
```

## API 接口

### 获取前缀列表

```
GET /api/prefixes
```

返回所有 NAT64 提供商和前缀信息。

### 测试单个前缀

```
GET /api/test?prefix=<nat64_prefix>
```

测试指定的 NAT64 前缀延迟。

## 技术栈

- **运行时**: Cloudflare Workers / Pages
- **语言**: JavaScript (ES6+)
- **API**: Cloudflare Sockets API
- **前端**: 原生 HTML/CSS/JavaScript
- **构建工具**: Wrangler

## 开发指南

### 添加新功能

1. 在相应的服务模块中添加业务逻辑
2. 在 API 路由中添加新的端点
3. 更新前端界面（如果需要）
4. 更新配置文件（如果需要）

### 代码规范

- 使用 ES6+ 语法
- 遵循模块化设计原则
- 添加适当的错误处理
- 编写清晰的注释

## 故障排除

### 常见问题

1. **测试失败率高**
   - 检查网络连接
   - 调整并发限制
   - 检查目标服务器状态

2. **部署失败**
   - 确认 Wrangler 配置正确
   - 检查账户权限
   - 查看错误日志

3. **前端加载问题**
   - 检查 API 端点是否正常
   - 查看浏览器控制台错误
   - 确认 CORS 设置

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
