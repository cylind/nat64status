# NAT64 延迟测试工具 - 项目结构说明

## 重构完成总结

✅ **重构目标已全部完成**：
- ✅ 将单文件代码重构为模块化架构
- ✅ 创建清晰的文件结构和组件分离
- ✅ 保留原有的 `_worker.js` 作为向后兼容
- ✅ 新建适合 Cloudflare Pages 的项目结构
- ✅ 确保两种部署方式都能正常工作
- ✅ 保持代码的可维护性和可扩展性

## 完整项目结构

```
nat64-latency-test/
├── 📄 README.md                    # 项目说明文档
├── 📄 DEPLOYMENT.md                # 部署指南
├── 📄 PROJECT_STRUCTURE.md         # 项目结构说明（本文件）
├── 📄 package.json                 # 项目配置和依赖
├── 📄 package-lock.json            # 依赖锁定文件
├── 📄 wrangler.toml                # Cloudflare Worker 配置
├── 📄 _worker.js                   # 原始单文件版本（向后兼容）
│
├── 📁 src/                         # 源代码目录（Worker 版本）
│   ├── 📄 index.js                 # 主入口文件
│   ├── 📁 config/                  # 配置文件
│   │   └── 📄 constants.js         # 常量配置
│   ├── 📁 api/                     # API 路由
│   │   ├── 📄 router.js            # 路由处理器
│   │   ├── 📄 prefixes.js          # 前缀获取API
│   │   └── 📄 test.js              # 测试API
│   ├── 📁 services/                # 业务逻辑
│   │   ├── 📄 nat64Service.js      # NAT64相关服务
│   │   └── 📄 testService.js       # 测试服务
│   ├── 📁 utils/                   # 工具函数
│   │   └── 📄 helpers.js           # 辅助函数
│   └── 📁 views/                   # 前端资源
│       └── 📄 index.html.js        # HTML模板生成器
│
├── 📁 public/                      # 静态资源（Pages 版本）
│   ├── 📄 index.html               # 静态HTML页面
│   ├── 📁 css/
│   │   └── 📄 styles.css           # 样式文件
│   └── 📁 js/
│       └── 📄 app.js               # 前端JavaScript
│
└── 📁 functions/                   # Cloudflare Pages Functions
    └── 📁 api/
        ├── 📄 prefixes.js          # 前缀获取API端点
        └── 📄 test.js              # 测试API端点
```

## 文件功能说明

### 核心配置文件

| 文件 | 功能 | 重要性 |
|------|------|--------|
| `package.json` | 项目配置、依赖管理、脚本定义 | ⭐⭐⭐ |
| `wrangler.toml` | Cloudflare Worker 部署配置 | ⭐⭐⭐ |
| `src/config/constants.js` | 全局常量和配置项 | ⭐⭐⭐ |

### Worker 版本核心文件

| 文件 | 功能 | 重要性 |
|------|------|--------|
| `src/index.js` | Worker 主入口，处理请求分发 | ⭐⭐⭐ |
| `src/api/router.js` | 路由处理和请求分发 | ⭐⭐⭐ |
| `src/services/nat64Service.js` | NAT64 提供商数据获取和解析 | ⭐⭐⭐ |
| `src/services/testService.js` | 延迟测试核心逻辑 | ⭐⭐⭐ |
| `src/utils/helpers.js` | 通用工具函数 | ⭐⭐ |

### Pages 版本核心文件

| 文件 | 功能 | 重要性 |
|------|------|--------|
| `public/index.html` | 静态HTML页面 | ⭐⭐⭐ |
| `public/js/app.js` | 前端JavaScript逻辑 | ⭐⭐⭐ |
| `public/css/styles.css` | 样式定义 | ⭐⭐ |
| `functions/api/prefixes.js` | Pages Function - 前缀API | ⭐⭐⭐ |
| `functions/api/test.js` | Pages Function - 测试API | ⭐⭐⭐ |

### 向后兼容文件

| 文件 | 功能 | 重要性 |
|------|------|--------|
| `_worker.js` | 原始单文件版本，保持向后兼容 | ⭐⭐ |

## 架构设计原则

### 1. 模块化分离
- **配置层**：`src/config/` - 集中管理配置和常量
- **服务层**：`src/services/` - 核心业务逻辑
- **API层**：`src/api/` - 请求处理和路由
- **工具层**：`src/utils/` - 通用辅助函数
- **视图层**：`src/views/` 和 `public/` - 前端展示

### 2. 部署兼容性
- **Worker 部署**：使用 `src/` 目录下的模块化代码
- **Pages 部署**：使用 `public/` 和 `functions/` 目录
- **单文件部署**：保留原始 `_worker.js` 文件

### 3. 代码复用
- 核心逻辑在不同部署方式间共享
- 配置统一管理，避免重复
- 工具函数模块化，便于测试和维护

## 技术特点

### 现代化开发
- ✅ ES6+ 模块系统
- ✅ 异步/等待模式
- ✅ 错误处理机制
- ✅ 类型安全的配置

### 性能优化
- ✅ 并发控制机制
- ✅ 合理的超时设置
- ✅ 资源清理和释放
- ✅ 缓存友好的响应头

### 安全性
- ✅ CORS 支持
- ✅ CSP 安全头
- ✅ 输入验证
- ✅ 错误信息过滤

### 可维护性
- ✅ 清晰的模块边界
- ✅ 统一的错误处理
- ✅ 详细的代码注释
- ✅ 一致的命名规范

## 使用指南

### 开发环境
```bash
# 安装依赖
npm install

# Worker 开发
npm run dev

# Pages 开发
npm run pages:dev
```

### 生产部署
```bash
# Worker 部署
npm run deploy

# Pages 部署
npm run pages:deploy

# 单文件部署
npx wrangler deploy _worker.js
```

### 代码修改指南
1. **修改配置**：编辑 `src/config/constants.js`
2. **修改业务逻辑**：编辑 `src/services/` 下的文件
3. **修改API**：编辑 `src/api/` 下的文件
4. **修改前端**：编辑 `public/` 下的文件
5. **修改Pages函数**：编辑 `functions/` 下的文件

## 扩展建议

### 功能扩展
- 添加更多测试指标（丢包率、抖动等）
- 支持自定义测试目标
- 添加历史数据存储
- 实现测试结果导出

### 技术改进
- 添加 TypeScript 支持
- 实现单元测试
- 添加 CI/CD 流程
- 优化错误处理

### 部署优化
- 添加监控和告警
- 实现蓝绿部署
- 配置 CDN 缓存
- 优化冷启动时间

这个重构项目成功地将原始的单文件代码转换为了现代化的模块化架构，同时保持了功能完整性和部署灵活性。
