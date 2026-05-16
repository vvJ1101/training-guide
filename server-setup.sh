#!/bin/bash
# ============================================
# YUAN 培训系统 - 服务器端自动部署配置
# 在服务器上运行一次即可完成初始化
# 用法: ssh 到服务器后运行 ./server-setup.sh
# ============================================

set -e

# ---------- 配置区 ----------
DOMAIN="your-domain.com"              # 域名（如 nginx 配置用）
WEBROOT="/var/www/yuan-training"      # 网站根目录
REPO_DIR="/var/git/yuan-training.git" # Git 仓库位置
# ----------------------------

echo "🔧 配置服务器端自动部署..."

# 1. 创建网站目录
echo "📁 创建网站目录: $WEBROOT"
mkdir -p "$WEBROOT"

# 2. 创建 bare git 仓库
echo "📁 创建 Git 仓库: $REPO_DIR"
mkdir -p "$REPO_DIR"
cd "$REPO_DIR"
git init --bare

# 3. 创建 post-receive hook (git push 时自动部署)
echo "🪝 创建 post-receive hook..."
cat > hooks/post-receive << 'HOOK'
#!/bin/bash
# git push 时自动将文件检出到网站目录

WEBROOT="/var/www/yuan-training"
GIT_WORK_TREE="$WEBROOT" git checkout -f main

# 设置权限
chmod -R 755 "$WEBROOT"

echo "✅ 已部署到 $WEBROOT"
HOOK

chmod +x hooks/post-receive

# 4. Nginx 配置模板
echo ""
echo "============================================"
echo "✅ 服务器端配置完成！"
echo ""
echo "📋 还需要手动完成以下步骤："
echo ""
echo "1. 配置 Nginx（或 Apache）指向 $WEBROOT"
echo "   参考配置:"
echo ""
cat << 'NGINX'
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/yuan-training;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # 静态资源缓存
    location ~* \.(jpg|png|css|js)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX
echo ""
echo "2. 在本地电脑执行以下命令添加远程仓库:"
echo "   git remote add production user@your-server:$REPO_DIR"
echo ""
echo "3. 之后每次部署只需:"
echo "   git push production main"
echo "============================================"
