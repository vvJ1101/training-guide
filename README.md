# YUAN 培训系统

> YUAN 公司内部培训平台 — 联欣与康雷 ERP 系统操作指南、实操考核、FAQ 知识库

**线上地址：** http://120.79.162.27

---

## 技术栈

纯静态网站 — HTML + CSS + 原生 JavaScript，无框架依赖，无需构建。

## 目录结构

```
├── index.html              # 主页
├── README.md
├── assets/                 # 共享资源
│   ├── logo-transparent.png
│   └── favicon-32.png
├── scripts/                # 工具脚本
│   ├── deploy.sh           # 一键部署
│   ├── server-setup.sh     # 服务器 git 自动部署
│   └── docx2html.py        # Word → HTML 转换
├── training/               # 培训文档（5 个部门）
│   ├── 市场部/              # 联欣 & 康雷操作流程（参考标准）
│   ├── 商品部/              # 截单转采购 · 转发货 · 系统建档
│   ├── 财务部/              # 回款审核 · 品牌结算 · 应付核算
│   ├── 品牌部-内部/         # 联欣数据查看 · 报表导出
│   └── 品牌部-外部/         # 康雷 ERP 品牌方手册
├── exam/                   # 实操考核系统
│   ├── index.html
│   ├── css/exam.css
│   └── js/exam.js
└── faq/                    # FAQ 知识库
    ├── index.html          # 内部操作 FAQ（26 条）
    ├── brand-external.html # 合作品牌方 FAQ
    └── css/faq.css
```

## 服务器信息

| 项目 | 详情 |
|------|------|
| 云服务商 | 阿里云 ECS |
| 公网 IP | 120.79.162.27 |
| 系统 | Ubuntu 22.04.5 LTS |
| Web 服务器 | Nginx |
| 网站目录 | /var/www/sites/ |
| SSH 用户 | root |
| SSH 密码 | Huang991208 |
| Nginx 配置 | /etc/nginx/sites-enabled/training |

## 系统入口

| 页面 | 地址 |
|------|------|
| 主页 | http://120.79.162.27/ |
| 市场部 | http://120.79.162.27/training/市场部/ |
| 商品部 | http://120.79.162.27/training/商品部/ |
| 品牌部 | http://120.79.162.27/training/品牌部-内部/ |
| 合作品牌方 | http://120.79.162.27/training/品牌部-外部/ |
| 财务部 | http://120.79.162.27/training/财务部/ |
| 考核系统 | http://120.79.162.27/exam/ |
| FAQ 知识库 | http://120.79.162.27/faq/ |

## 考核系统

- **答题者登录：** 选"答题者"角色，输入姓名和考核密码（管理员在设置中配置）
- **考核官登录：** 选"考核官"角色，输入姓名，密码 `admin123`
- 数据存储：localStorage（任务数据）+ IndexedDB（截图图片）
- 支持批量创建任务、模板管理、审核打分、成绩单导出

## 部署方式

### 快速部署（推荐）

```bash
cd scripts
./deploy.sh
```

### Git 自动部署

1. 把 `scripts/server-setup.sh` 上传到服务器执行
2. 本地：`git remote add production root@120.79.162.27:/var/git/yuan-training.git`
3. 部署：`git push production main`

## 设计系统

| 变量 | 值 | 用途 |
|------|-----|------|
| 主色 | `#2563eb` | 链接、按钮、强调 |
| 标题色 | `#0f172a` | 标题文字 |
| 背景色 | `#f8fafc` | 页面背景 |
| 绿色 | `#16a34a` | 流程框、成功状态 |
| 橙色 | `#ea580c` | 警告框 |
| 红色 | `#dc2626` | 重点加粗、危险操作 |

5 个培训部门共享 CSS（`training/*/css/style.css`），支持暗色模式、移动端适配和打印样式。

## 注意事项

- 本项目为内部培训使用，不要将服务器信息泄露给无关人员
- 考核系统使用浏览器本地存储，**清除浏览器数据会导致考核记录丢失**，建议定期使用考核官面板的"数据备份"功能导出
- 修改培训文档时，保持与市场部文档的结构一致（目录 → 术语表 → 流程 → 截图）
- 截图文件较大（总计约 24MB），首次部署或全量同步需要等待
- Nginx 配置中包含 `/coffee/`、`/api/`、`/db/` 等其他服务，部署时不要覆盖或删除这些目录
