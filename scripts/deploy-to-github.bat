@echo off
setlocal enabledelayedexpansion

REM NAT64 延迟测试工具 - GitHub 部署脚本 (Windows版本)
REM 使用方法: scripts\deploy-to-github.bat [GitHub用户名]

echo.
echo ========================================
echo NAT64 延迟测试工具 - GitHub 部署脚本
echo ========================================
echo.

REM 检查参数
if "%1"=="" (
    echo [ERROR] 请提供 GitHub 用户名
    echo 使用方法: %0 ^<GitHub用户名^>
    echo 示例: %0 yourusername
    pause
    exit /b 1
)

set GITHUB_USERNAME=%1
set REPO_NAME=nat64-latency-test
set REPO_URL=https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git

echo [INFO] GitHub 用户名: %GITHUB_USERNAME%
echo [INFO] 仓库名称: %REPO_NAME%
echo [INFO] 仓库 URL: %REPO_URL%
echo.

REM 检查是否在正确的目录
if not exist "package.json" (
    echo [ERROR] 请在项目根目录运行此脚本
    pause
    exit /b 1
)

echo [STEP] 检查必要文件...

REM 检查必要文件
set files_missing=0

if not exist "package.json" (
    echo [ERROR] 缺少文件: package.json
    set files_missing=1
)
if not exist "wrangler.toml" (
    echo [ERROR] 缺少文件: wrangler.toml
    set files_missing=1
)
if not exist "README.md" (
    echo [ERROR] 缺少文件: README.md
    set files_missing=1
)
if not exist "public\index.html" (
    echo [ERROR] 缺少文件: public\index.html
    set files_missing=1
)
if not exist "functions\api\prefixes.js" (
    echo [ERROR] 缺少文件: functions\api\prefixes.js
    set files_missing=1
)
if not exist "functions\api\test.js" (
    echo [ERROR] 缺少文件: functions\api\test.js
    set files_missing=1
)
if not exist "_worker.js" (
    echo [ERROR] 缺少文件: _worker.js
    set files_missing=1
)

if %files_missing%==1 (
    echo [ERROR] 存在缺失文件，请检查项目完整性
    pause
    exit /b 1
)

echo [INFO] 所有必要文件检查通过

REM 检查 Git 是否已安装
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git 未安装，请先安装 Git
    echo 下载地址: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [INFO] Git 已安装

REM 检查是否已经是 Git 仓库
if not exist ".git" (
    echo [STEP] 初始化 Git 仓库...
    git init
    echo [INFO] Git 仓库已初始化
) else (
    echo [INFO] Git 仓库已存在
)

REM 检查是否有远程仓库
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%i in ('git remote get-url origin') do set current_origin=%%i
    echo [WARNING] 已存在远程仓库: !current_origin!
    set /p update_origin="是否要更新为新的仓库地址? (y/N): "
    if /i "!update_origin!"=="y" (
        git remote set-url origin "%REPO_URL%"
        echo [INFO] 远程仓库地址已更新
    )
) else (
    echo [STEP] 添加远程仓库...
    git remote add origin "%REPO_URL%"
    echo [INFO] 远程仓库已添加
)

REM 检查 .gitignore 文件
if not exist ".gitignore" (
    echo [WARNING] .gitignore 文件不存在，将创建默认的
    (
        echo node_modules/
        echo .env
        echo .env.local
        echo .wrangler/
        echo dist/
        echo deploy-info.json
        echo *.log
        echo .DS_Store
        echo Thumbs.db
    ) > .gitignore
    echo [INFO] .gitignore 文件已创建
)

REM 添加所有文件
echo [STEP] 添加文件到 Git...
git add .

REM 检查是否有变更
git diff --staged --quiet
if not errorlevel 1 (
    echo [WARNING] 没有检测到文件变更
    set /p continue_push="是否继续推送? (y/N): "
    if not "!continue_push!"=="y" if not "!continue_push!"=="Y" (
        echo [INFO] 部署已取消
        pause
        exit /b 0
    )
) else (
    echo [INFO] 文件已添加到暂存区
)

REM 提交变更
echo [STEP] 提交变更...
git commit -m "Initial commit: NAT64 latency test tool" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] 没有新的变更需要提交
) else (
    echo [INFO] 变更已提交
)

REM 设置主分支
echo [STEP] 设置主分支...
git branch -M main

REM 推送到 GitHub
echo [STEP] 推送到 GitHub...
echo [INFO] 正在推送到: %REPO_URL%

git push -u origin main
if errorlevel 1 (
    echo [ERROR] 推送失败，请检查：
    echo 1. GitHub 仓库是否已创建
    echo 2. 您是否有推送权限
    echo 3. 网络连接是否正常
    pause
    exit /b 1
)

echo [INFO] 代码已成功推送到 GitHub!

REM 显示下一步操作
echo.
echo ========================================
echo 🎉 GitHub 部署完成！
echo ========================================
echo.
echo 下一步操作：
echo 1. 访问 GitHub 仓库: https://github.com/%GITHUB_USERNAME%/%REPO_NAME%
echo 2. 登录 Cloudflare Dashboard: https://dash.cloudflare.com/
echo 3. 选择 Pages → Create a project → Connect to Git
echo 4. 选择您的 GitHub 仓库并配置构建设置
echo.
echo 构建配置参数：
echo - Framework preset: None
echo - Build command: (留空)
echo - Build output directory: public
echo - Root directory: (留空)
echo.
echo 详细部署指南请查看: GITHUB_DEPLOYMENT_CHECKLIST.md
echo.
echo 祝您部署顺利！🚀
echo.
pause
