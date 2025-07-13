# 配置说明文档

## 项目配置解释

### 为什么 `public/` 目录需要包含在 Git 中？

在我们的 NAT64 延迟测试工具项目中，`public/` 目录的作用与传统的构建输出目录不同：

#### 🔍 传统项目 vs 我们的项目

**传统前端项目**：
```
src/ (源代码)
  ├── components/
  ├── styles/
  └── index.js
public/ (构建输出，由工具生成)
  ├── index.html
  ├── bundle.js
  └── styles.css
```
在这种情况下，`public/` 是构建工具生成的，应该被 `.gitignore` 排除。

**我们的项目**：
```
src/ (Worker 版本源代码)
  ├── api/
  ├── services/
  └── index.js
public/ (Pages 版本的源代码)
  ├── index.html (手写的静态页面)
  ├── css/styles.css (手写的样式)
  └── js/app.js (手写的前端逻辑)
functions/ (Pages Functions 源代码)
  └── api/
```

#### 📁 我们项目中的 `public/` 目录

在我们的项目中，`public/` 目录包含的是：
- **手写的源代码文件**，不是构建输出
- **Cloudflare Pages 部署所需的静态资源**
- **与 `src/` 目录平行的另一种部署方式的源码**

### 部署方式对应关系

| 部署方式 | 使用的目录 | 说明 |
|----------|------------|------|
| **Cloudflare Worker** | `src/` | 模块化的 Worker 代码 |
| **Cloudflare Pages** | `public/` + `functions/` | 静态文件 + Pages Functions |
| **单文件 Worker** | `_worker.js` | 原始单文件版本 |

### Cloudflare Pages 配置解释

#### Build Output Directory: `public`

这个配置告诉 Cloudflare Pages：
- 在 `public/` 目录中查找静态文件
- 将这些文件部署为网站的根目录
- `public/index.html` → 网站首页
- `public/css/styles.css` → `/css/styles.css`
- `public/js/app.js` → `/js/app.js`

#### Build Command: 留空

我们不需要构建命令，因为：
- `public/` 中的文件已经是最终形态
- 不需要编译、打包或转换
- 直接部署即可使用

### 文件结构详解

```
nat64-latency-test/
├── src/                          # Worker 部署版本
│   ├── index.js                  # Worker 入口
│   ├── api/                      # API 路由
│   ├── services/                 # 业务逻辑
│   └── views/index.html.js       # 内嵌 HTML 生成器
│
├── public/                       # Pages 部署版本（静态文件）
│   ├── index.html                # 静态 HTML 页面
│   ├── css/styles.css            # 样式文件
│   └── js/app.js                 # 前端 JavaScript
│
├── functions/                    # Pages Functions
│   └── api/                      # API 端点
│       ├── prefixes.js           # 前缀获取 API
│       └── test.js               # 测试 API
│
└── _worker.js                    # 单文件版本（向后兼容）
```

### 为什么这样设计？

#### 1. 多部署方式支持
- **灵活性**：用户可以选择最适合的部署方式
- **兼容性**：保持向后兼容，支持原有的单文件部署

#### 2. 代码复用
- 核心逻辑在不同版本间共享
- 减少重复代码，便于维护

#### 3. 部署简化
- Pages 版本无需构建步骤
- 直接部署静态文件，速度更快

### 常见误解澄清

#### ❌ 错误理解
"public/ 是构建输出目录，应该被 .gitignore 排除"

#### ✅ 正确理解
"在我们的项目中，public/ 是 Pages 版本的源代码目录，需要包含在 Git 中"

### 部署验证

部署后，您可以验证文件是否正确：

1. **检查静态文件**：
   - 访问 `https://your-site.pages.dev/` → 应该显示主页
   - 访问 `https://your-site.pages.dev/css/styles.css` → 应该显示样式
   - 访问 `https://your-site.pages.dev/js/app.js` → 应该显示 JavaScript

2. **检查 API 端点**：
   - 访问 `https://your-site.pages.dev/api/prefixes` → 应该返回 JSON 数据
   - 访问 `https://your-site.pages.dev/api/test?prefix=xxx` → 应该执行测试

### 如果您想要传统的构建流程

如果您更喜欢传统的构建流程，可以：

1. **将 `public/` 改为 `dist/` 或 `build/`**
2. **添加构建脚本**将源文件编译到输出目录
3. **在 `.gitignore` 中排除输出目录**
4. **在 Cloudflare Pages 中设置构建命令**

但对于我们这个项目，当前的设计更简单直接。

### 总结

- ✅ `public/` 目录包含 Pages 版本的源代码，需要提交到 Git
- ✅ Cloudflare Pages 直接使用 `public/` 中的文件，无需构建
- ✅ 这种设计简化了部署流程，提高了可维护性
- ✅ 支持多种部署方式，满足不同用户需求
