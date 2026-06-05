# YUAN SHOWROOM — AI 协作规范

> 最后更新：2026-06-05

---

## 一、项目概要

**YUAN SHOWROOM** 是深圳（香港）时胜集团（时胜/圜界/屹圆/元睎四家子公司）的对外品牌官网 + 内部培训知识库系统。

- **对外**：Hero / About / Services / Brands / Projects / Showroom / Data / Cooperation 8 个品牌展示模块
- **对内**：员工入职培训、SOP 操作手册、FAQ 知识库、AI 智能问答

### 访问信息

| 项目 | 地址/账号 |
|------|-----------|
| 官网 | http://120.79.162.27/showroom/ |
| 员工登录 | http://120.79.162.27/showroom/login |
| 管理员 | admin@yuanshowroom.com / admin123 |
| 服务器 | 阿里云 ECS `120.79.162.27`，Ubuntu 22.04，Nginx + PM2 |
| Node | v18.20.8 |

---

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14.2 (App Router) + TypeScript + TailwindCSS + Framer Motion |
| 数据库 | SQLite (`prisma/dev.db`) + Prisma ORM 5.22 (better-sqlite3) |
| AI | DeepSeek API (`deepseek-chat`)，OpenAI SDK 兼容，SSE 流式 |
| 全文搜索 | SQLite FTS5 |
| 文档解析 | mammoth (DOCX → HTML) + 自定义 Markdown 转换 |
| 图表 | Mermaid (流程图) |
| 部署 | 阿里云 ECS + Nginx + PM2 (`max_memory_restart: 300M`)，basePath `/showroom` |

---

## 三、目录结构

```
src/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # 官网首页
│   ├── layout.tsx                    # 根布局
│   ├── globals.css                   # 全局样式
│   ├── login/                        # 登录页
│   ├── internal/
│   │   ├── dashboard/                # 工作台（统计 + 最近文档）
│   │   ├── documents/                # 文档管理中心（列表+上传+编辑+删除）
│   │   ├── docs/[department]/[slug]/ # 文档阅读页（原文/精简版切换）
│   │   ├── search/                   # 全文搜索
│   │   ├── faq/                      # FAQ 管理
│   │   ├── policy/                   # 政策查看
│   │   ├── policy-upload/            # 政策上传
│   │   └── admin/users/              # 用户管理
│   └── api/
│       ├── auth/login|logout|me/     # 认证
│       ├── audit/                    # 审计日志
│       ├── chat/                     # AI 问答（DeepSeek + FTS + SSE）
│       ├── companies/                # 公司列表
│       ├── dashboard/                # 工作台统计
│       ├── departments/              # 部门列表
│       ├── documents/                # 文档 CRUD
│       │   └── [id]/analyze/         # AI 智能解析
│       ├── faq/                      # FAQ CRUD
│       ├── search/                   # FTS 搜索
│       └── users/                    # 用户管理
├── components/
│   ├── layout/                       # Nav, Footer
│   ├── sections/                     # 首页 8 模块
│   ├── ui/                           # 通用 UI
│   └── internal/
│       ├── markdown-reader.tsx        # 精简版阅读器
│       ├── ai-analyzer.tsx            # AI 解析对比视图模态框
│       ├── editable-markdown.tsx      # 块级点击编辑组件
│       ├── ai-chat.tsx               # AI 问答浮动按钮
│       └── internal-sidebar.tsx       # 公司→部门折叠导航
├── lib/
│   ├── auth.ts                       # Session + 权限
│   ├── parser.ts                     # DOCX → Markdown 解析器
│   ├── prisma.ts                     # Prisma 客户端
│   └── constants.ts                  # 站点配置
└── middleware.ts                      # 边缘鉴权（RBAC）
prisma/
├── schema.prisma                     # User/Company/Department/Document/Faq/ChatLog/AuditLog
├── seed.ts                           # 4 公司 + 7 部门 + admin 用户
└── dev.db                            # SQLite 数据库
scripts/
├── fts-migrate.ts                    # FTS5 全文索引
├── seed-faq.ts                       # FAQ 种子数据
└── ingest.ts                         # DOCX 批量导入
public/images/
├── brands/                           # 品牌图片
├── editorial/                        # 编辑图片
└── showroom/                         # 展厅图片
```

---

## 四、核心功能

### 知识库文档
- DOCX 上传，mammoth 纯解析保留原文格式
- **双版本模式**：原文（只读 FullContent）+ 精简版（可编辑 CondensedContent）
- 精简版块级编辑：标题/段落/表格/列表/图片，Ctrl+Z 撤销，拖拽排序，表格行列增删
- 按公司→部门→类型三维筛选

### AI 智能解析（核心亮点）
- `POST /api/documents/[id]/analyze`：自动生成总体流程图 + 章节流程图 + 对比表格 + 操作要点 + 逻辑缺失检测
- 对比视图模态框：左侧原文只读 + 右侧草案编辑/预览，支持 [✅ 应用] / [🔄 重新生成] / [✏️ 手动编辑]
- AI 问答：基于文档的 RAG（DeepSeek + FTS5 检索增强），SSE 流式输出

### 认证与权限
- 登录/登出（bcryptjs + cookie-based session）
- **三级角色**：`super_admin` > `dept_admin` > `staff`
- Middleware 边缘鉴权 + AuthGuard 服务端鉴权
- RBAC：SUPER_ADMIN 路由保护 + API 写操作权限控制
- dept_admin 只能管理本公司的文档和用户

### 组织架构
- 4 家公司：时胜、圜界、屹圆、元睎
- 7 个部门（全归属时胜）：人事部、财务部、品牌部、商品部、市场部、订货会、品牌方
- 侧边栏公司→部门折叠树导航，移动端抽屉式菜单

### FAQ 系统
- 预置 22 条 FAQ，覆盖 5 个部门，按部门 + 分类筛选，支持 CRUD

### 工作台
- 文档/公司/部门统计 + 最近文档 + 审计日志 + 用户管理

---

## 五、数据库模型

```
Company (公司) → Department (部门) → User (用户)
                                   → Document (文档)
                                      ├── DocumentAudience (可见部门)
                                      ├── AuditLog (查看日志)
                                      └── ChatLog (AI 问答记录)
Faq (常见问题) → Department
```

Document 核心字段：
- `fullContent`：DOCX 原文（只读）
- `condensedContent`：AI 生成精简版（可编辑）
- `displayMode`：`full` / `condensed` / `both`

---

## 六、关键页面路由

| 路由 | 功能 | 权限 |
|------|------|------|
| `/` | 品牌官网首页 | 公开 |
| `/login` | 员工登录 | 公开 |
| `/internal/dashboard` | 工作台 | 登录 |
| `/internal/documents` | 文档管理中心 | dept_admin+ |
| `/internal/docs/[dept]/[slug]` | 文档阅读页 | 登录 |
| `/internal/search` | 全文搜索 | 登录 |
| `/internal/faq` | FAQ 管理 | dept_admin+ |
| `/internal/admin/users` | 用户管理 | super_admin |

---

## 七、重要技术决策

### 路由规范
- `basePath: '/showroom'`，`<Link>` 和 `router.push()` **自动加前缀**
- `<a>` 和 `fetch()` 需**手动写** `/showroom/...`

### 权限模型
- Session cookie：明文 JSON `{id, role, companyId, departmentId, departmentName}`
- Middleware 控制 API 写权限，AuthGuard 控制页面访问

### AI 集成
- DeepSeek `deepseek-chat` via OpenAI SDK (`https://api.deepseek.com/v1`)
- 文档解析：非流式，max_tokens 4096，temperature 0.3
- AI 问答：SSE 流式，max_tokens 800，FTS5 检索增强

### 部署
- 本地构建 `.next` → `tar -czf` → `scp` → 服务器解压 → PM2 重启
- `prisma/dev.db` **不包含**在部署包中（服务器数据库独立）
- SSH Ed25519 免密登录

---

## 八、本地开发

```bash
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

---

## 九、部署

```bash
npm run build
tar -czf deploy.tar.gz .next
scp deploy.tar.gz root@120.79.162.27:/tmp/
ssh root@120.79.162.27
cd /var/www/yuan-showroom && tar -xzf /tmp/deploy.tar.gz
pm2 restart yuan-showroom
```

---

## 十、禁止事项

- ❌ 禁止用 SQLite 函数更新 `fullContent`（二进制损坏风险）
- ❌ 禁止在 `<Link>` 中写 `/showroom/` 前缀（造成双前缀 404）
- ❌ 禁止未经确认修改数据库 Schema
- ❌ `prisma/dev.db` 不随部署包上传

---

## 十一、待办

- [ ] 搜索中文分词优化（FTS5 unicode61 → jieba/trigram）
- [ ] AI Chat 缓存层（避免重复问题重复计费）
- [ ] 图片懒加载优化
- [ ] 旧静态站点清理
