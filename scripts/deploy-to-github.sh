#!/bin/bash

# NAT64 延迟测试工具 - GitHub 部署脚本
# 使用方法: ./scripts/deploy-to-github.sh [GitHub用户名]

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查参数
if [ $# -eq 0 ]; then
    print_error "请提供 GitHub 用户名"
    echo "使用方法: $0 <GitHub用户名>"
    echo "示例: $0 yourusername"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="nat64-latency-test"
REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

print_message "开始部署 NAT64 延迟测试工具到 GitHub..."
echo "GitHub 用户名: $GITHUB_USERNAME"
echo "仓库名称: $REPO_NAME"
echo "仓库 URL: $REPO_URL"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    print_error "请在项目根目录运行此脚本"
    exit 1
fi

# 检查必要文件
print_step "检查必要文件..."
required_files=(
    "package.json"
    "wrangler.toml"
    "README.md"
    "public/index.html"
    "functions/api/prefixes.js"
    "functions/api/test.js"
    "_worker.js"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "缺少必要文件: $file"
        exit 1
    fi
    print_message "✓ $file"
done

# 检查 Git 是否已安装
if ! command -v git &> /dev/null; then
    print_error "Git 未安装，请先安装 Git"
    exit 1
fi

# 检查是否已经是 Git 仓库
if [ ! -d ".git" ]; then
    print_step "初始化 Git 仓库..."
    git init
    print_message "Git 仓库已初始化"
else
    print_message "Git 仓库已存在"
fi

# 检查是否有远程仓库
if git remote get-url origin &> /dev/null; then
    current_origin=$(git remote get-url origin)
    print_warning "已存在远程仓库: $current_origin"
    read -p "是否要更新为新的仓库地址? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote set-url origin "$REPO_URL"
        print_message "远程仓库地址已更新"
    fi
else
    print_step "添加远程仓库..."
    git remote add origin "$REPO_URL"
    print_message "远程仓库已添加"
fi

# 检查 .gitignore 文件
if [ ! -f ".gitignore" ]; then
    print_warning ".gitignore 文件不存在，将创建默认的"
    cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
.wrangler/
dist/
deploy-info.json
*.log
.DS_Store
Thumbs.db
EOF
    print_message ".gitignore 文件已创建"
fi

# 添加所有文件
print_step "添加文件到 Git..."
git add .

# 检查是否有变更
if git diff --staged --quiet; then
    print_warning "没有检测到文件变更"
    read -p "是否继续推送? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_message "部署已取消"
        exit 0
    fi
else
    print_message "文件已添加到暂存区"
fi

# 提交变更
print_step "提交变更..."
commit_message="Initial commit: NAT64 latency test tool

Features:
- Modular architecture with Worker and Pages support
- NAT64 latency testing functionality
- Responsive web interface
- Comprehensive documentation

Deployment ready for Cloudflare Pages."

git commit -m "$commit_message" || print_warning "没有新的变更需要提交"

# 设置主分支
print_step "设置主分支..."
git branch -M main

# 推送到 GitHub
print_step "推送到 GitHub..."
print_message "正在推送到: $REPO_URL"

if git push -u origin main; then
    print_message "✓ 代码已成功推送到 GitHub!"
else
    print_error "推送失败，请检查："
    echo "1. GitHub 仓库是否已创建"
    echo "2. 您是否有推送权限"
    echo "3. 网络连接是否正常"
    exit 1
fi

# 显示下一步操作
echo ""
print_message "🎉 GitHub 部署完成！"
echo ""
echo "下一步操作："
echo "1. 访问 GitHub 仓库: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo "2. 登录 Cloudflare Dashboard: https://dash.cloudflare.com/"
echo "3. 选择 Pages → Create a project → Connect to Git"
echo "4. 选择您的 GitHub 仓库并配置构建设置"
echo ""
echo "构建配置参数："
echo "- Framework preset: None"
echo "- Build command: (留空)"
echo "- Build output directory: public"
echo "- Root directory: (留空)"
echo ""
echo "详细部署指南请查看: GITHUB_DEPLOYMENT_CHECKLIST.md"
echo ""
print_message "祝您部署顺利！🚀"
