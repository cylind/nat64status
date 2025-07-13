#!/usr/bin/env node

/**
 * 构建脚本 - 为不同部署方式准备文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 开始构建 NAT64 延迟测试工具...\n');

// 检查必要文件是否存在
function checkFiles() {
  const requiredFiles = [
    'src/index.js',
    'public/index.html',
    'functions/api/prefixes.js',
    'functions/api/test.js',
    '_worker.js'
  ];

  console.log('📋 检查必要文件...');
  
  for (const file of requiredFiles) {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 缺少必要文件: ${file}`);
      process.exit(1);
    }
    console.log(`✅ ${file}`);
  }
  
  console.log('');
}

// 验证配置文件
function validateConfig() {
  console.log('🔧 验证配置文件...');
  
  // 检查 package.json
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (packageJson.type !== 'module') {
    console.warn('⚠️  建议在 package.json 中设置 "type": "module"');
  }
  
  // 检查 wrangler.toml
  const wranglerPath = path.join(projectRoot, 'wrangler.toml');
  if (!fs.existsSync(wranglerPath)) {
    console.error('❌ 缺少 wrangler.toml 配置文件');
    process.exit(1);
  }
  
  console.log('✅ 配置文件验证通过\n');
}

// 生成部署信息
function generateDeployInfo() {
  console.log('📝 生成部署信息...');
  
  const deployInfo = {
    buildTime: new Date().toISOString(),
    version: JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')).version,
    deploymentOptions: {
      worker: {
        command: 'npm run deploy',
        description: 'Cloudflare Worker 部署'
      },
      pages: {
        command: 'npm run pages:deploy',
        description: 'Cloudflare Pages 部署'
      },
      singleFile: {
        command: 'npx wrangler deploy _worker.js',
        description: '单文件 Worker 部署'
      }
    },
    files: {
      worker: ['src/', 'wrangler.toml'],
      pages: ['public/', 'functions/'],
      singleFile: ['_worker.js']
    }
  };
  
  const deployInfoPath = path.join(projectRoot, 'deploy-info.json');
  fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
  
  console.log('✅ 部署信息已生成: deploy-info.json\n');
}

// 创建快速开始指南
function createQuickStart() {
  console.log('📖 创建快速开始指南...');
  
  const quickStart = `# 快速开始指南

## 选择部署方式

### 1. Cloudflare Worker 部署（推荐）
\`\`\`bash
npm install
npx wrangler login
npm run deploy
\`\`\`

### 2. Cloudflare Pages 部署
\`\`\`bash
# 方式一：Git 集成（推荐）
git init
git add .
git commit -m "Initial commit"
git push origin main
# 然后在 Cloudflare Dashboard 中连接仓库

# 方式二：直接部署
npm run pages:deploy
\`\`\`

### 3. 单文件部署（最简单）
\`\`\`bash
npx wrangler deploy _worker.js
\`\`\`

## 本地开发

### Worker 开发
\`\`\`bash
npm run dev
\`\`\`

### Pages 开发
\`\`\`bash
npm run pages:dev
\`\`\`

## 配置说明

编辑 \`wrangler.toml\` 文件来自定义配置：
- 修改 \`name\` 字段设置 Worker 名称
- 添加 \`routes\` 配置自定义域名
- 设置 \`vars\` 添加环境变量

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

构建时间: ${new Date().toLocaleString()}
`;

  const quickStartPath = path.join(projectRoot, 'QUICK_START.md');
  fs.writeFileSync(quickStartPath, quickStart);
  
  console.log('✅ 快速开始指南已创建: QUICK_START.md\n');
}

// 主构建流程
function main() {
  try {
    checkFiles();
    validateConfig();
    generateDeployInfo();
    createQuickStart();
    
    console.log('🎉 构建完成！\n');
    console.log('📋 可用的部署选项:');
    console.log('   1. Worker 部署: npm run deploy');
    console.log('   2. Pages 部署: npm run pages:deploy');
    console.log('   3. 单文件部署: npx wrangler deploy _worker.js\n');
    console.log('📖 查看 QUICK_START.md 获取详细指南');
    
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

// 运行构建
main();
