#!/bin/bash
# ============================================
# YUAN 培训系统 - 服务器端 git 自动部署配置
# 在服务器上运行一次即可，之后 git push 自动上线
# 用法: scp 到服务器后运行 ./server-setup.sh
# ============================================
set -e

WEBROOT="/var/www/sites"
REPO_DIR="/var/git/yuan-training.git"

echo "🔧 配置 git 自动部署..."
mkdir -p "$WEBROOT" "$REPO_DIR"

cd "$REPO_DIR"
git init --bare

cat > hooks/post-receive << 'HOOK'
#!/bin/bash
WEBROOT="/var/www/sites"
GIT_WORK_TREE="$WEBROOT" git checkout -f main
chmod -R 755 "$WEBROOT"
echo "✅ 已部署到 $WEBROOT"
HOOK
chmod +x hooks/post-receive

echo "✅ 服务端配置完成"
echo "本地执行: git remote add production root@120.79.162.27:$REPO_DIR"
echo "部署命令: git push production main"
