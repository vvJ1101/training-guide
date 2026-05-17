# YUAN 培训系统

YUAN 公司内部培训平台，为市场部、商品部、品牌部、财务部及合作品牌方提供联欣与康雷 ERP 系统的标准化操作指南、实操考核与常见问题知识库。

## 技术栈

纯静态网站 — HTML + CSS + 原生 JavaScript，无框架依赖。

## 目录结构

```
├── index.html              # 主页
├── README.md
├── assets/                 # 共享资源
│   ├── logo-transparent.png
│   └── favicon-32.png
├── scripts/                # 工具脚本
│   ├── deploy.sh           # rsync 快速部署
│   ├── server-setup.sh     # 服务器 git hook 自动部署
│   └── docx2html.py        # Word 文档转 HTML
├── training/               # 培训文档（5 个部门）
│   ├── 市场部/              # 联欣 & 康雷操作流程（参考标准）
│   ├── 商品部/              # 截单转采购 · 转发货 · 系统建档
│   ├── 财务部/              # 回款审核 · 品牌结算 · 应付核算
│   ├── 品牌部-内部/         # 联欣数据查看 · 报表导出
│   └── 品牌部-外部/         # 康雷 ERP 品牌方使用手册
├── exam/                   # 实操考核系统（SPA）
│   ├── css/exam.css
│   ├── js/exam.js
│   └── index.html
└── faq/                    # FAQ 知识库
    ├── css/faq.css
    ├── index.html          # 内部操作 FAQ
    └── brand-external.html # 合作品牌方 FAQ
```

## 本地预览

直接在浏览器打开 `index.html` 即可。所有链接使用相对路径，无需本地服务器。

## 部署

**服务器：** 阿里云 ECS · Ubuntu 22.04 · Nginx  
**网站目录：** `/var/www/sites/`  
**访问地址：** http://120.79.162.27

### 快速部署

```bash
cd scripts
./deploy.sh    # 先编辑脚本填写服务器信息
```

### Git 自动部署

在服务器执行 `scripts/server-setup.sh` 初始化，然后：

```bash
git push production main
```

## 考核系统

- 答题者登录 → 上传截图 → 提交考核
- 考核官登录 → 创建任务 → 审核 → 生成成绩单
- 支持批量创建考核任务、模板管理
- 数据存储：localStorage（任务）+ IndexedDB（截图）
- 管理员默认密码：`admin123`

## 设计系统

| 变量 | 用途 |
|------|------|
| 主色 `#2563eb` | 链接、按钮、强调 |
| 标题 `#0f172a` | 标题文字 |
| 背景 `#f8fafc` | 页面背景 |
| 绿色 `#16a34a` | 流程框、成功状态 |
| 橙色 `#ea580c` | 警告框 |
| 红色 `#dc2626` | 重点加粗、删除 |

培训文档共享同一 CSS 文件（`training/*/css/style.css`），支持暗色模式、移动端适配和打印样式。
