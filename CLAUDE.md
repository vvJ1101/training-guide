# YUAN SHOWROOM — AI 协作规范

> 最后更新：2026-06-06

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
| 文档解析 | mammoth (DOCX → HTML) + turndown (HTML → Markdown) |
| 图片提取 | mammoth `convertImage` + JSZip 兜底 |
| 图表 | Mermaid (流程图) |
| 部署 | 阿里云 ECS + Nginx + PM2 (`max_memory_restart: 300M`)，basePath `/showroom` |

---

## 三、目录结构

```
src/
├── app/                                    # Next.js App Router
│   ├── page.tsx                            # 官网首页
│   ├── layout.tsx                          # 根布局
│   ├── login/                              # 登录页
│   ├── internal/
│   │   ├── dashboard/                      # 工作台（六屏布局）
│   │   ├── documents/                      # 文档管理中心（上传+编辑+删除+AI解析）
│   │   │   └── upload/                     # 独立上传页
│   │   ├── docs/[department]/[slug]/       # 文档阅读页
│   │   ├── search/                         # 全文搜索
│   │   ├── faq/                            # FAQ 管理
│   │   ├── policy/                         # 政策查看
│   │   ├── policy-upload/                  # 政策上传
│   │   └── admin/users/                    # 用户管理
│   └── api/
│       ├── auth/login|logout|me/           # 认证
│       ├── audit/                          # 审计日志
│       ├── chat/                           # AI 问答（DeepSeek + FTS + SSE）
│       ├── companies/                      # 公司列表
│       ├── dashboard/                      # 工作台统计（含 AI 指标）
│       ├── departments/                    # 部门列表
│       ├── documents/                      # 文档 CRUD + 上传
│       │   ├── [id]/                       # 文档详情/编辑/删除
│       │   └── [id]/analyze/               # AI 两阶段解析
│       ├── faq/                            # FAQ CRUD
│       ├── search/                         # FTS 搜索
│       └── users/                          # 用户管理
├── components/
│   ├── layout/                             # Nav, Footer
│   ├── sections/                           # 首页 8 模块
│   ├── ui/                                 # 通用 UI
│   └── internal/
│       ├── dashboard/                      # Dashboard 六屏子组件
│       │   ├── hero-search.tsx             # AI 搜索区
│       │   ├── workspace-section.tsx       # 我的工作区
│       │   ├── stats-cards.tsx             # 知识库概览
│       │   ├── ai-capabilities.tsx         # AI 能力展示
│       │   ├── popular-knowledge.tsx       # 热门知识
│       │   └── quick-actions.tsx           # 快捷操作
│       ├── markdown-reader.tsx             # 精简版/原文阅读器
│       ├── ai-analyzer.tsx                 # AI 解析对比视图模态框
│       ├── editable-markdown.tsx           # 块级点击编辑组件
│       ├── ai-chat.tsx                     # AI 问答浮动按钮
│       ├── mermaid-renderer.tsx            # Mermaid SVG 渲染
│       ├── original-reader.tsx             # 原文只读组件
│       └── internal-sidebar.tsx            # 公司→部门折叠导航
├── lib/
│   ├── auth.ts                             # Session + 权限
│   ├── parser.ts                           # DOCX → Markdown（mammoth+turndown+JSZip）
│   ├── sanitize.ts                         # Markdown 乱码清洗
│   ├── prisma.ts                           # Prisma 客户端
│   ├── constants.ts                        # 站点配置
│   └── prompts/
│       ├── phase1-extract.ts               # Phase 1: 结构提取 Prompt
│       └── quality-reviewer-v1.ts          # 质量审核 Prompt
└── middleware.ts                            # 边缘鉴权（RBAC）
prisma/
├── schema.prisma                           # User/Company/Department/Document/Faq/ChatLog/AuditLog
├── seed.ts                                 # 4 公司 + 7 部门 + admin 用户
└── dev.db                                  # SQLite 数据库
scripts/
├── quality-review.ts                       # AI 解析质量批量审核脚本
├── fts-migrate.ts                          # FTS5 全文索引
├── seed-faq.ts                             # FAQ 种子数据
├── ingest.ts                               # DOCX 批量导入
├── server-deploy.sh                        # 服务器部署脚本
└── condensed-docs.ts                       # 精简版迁移脚本
```

---

## 四、核心功能

### DOCX 上传 → AI 解析流水线

```
DOCX 上传
  → parser.ts（mammoth convertImage + JSZip 兜底）
  → turndown（HTML → Markdown）
  → sanitizeMarkdown（乱码清洗）
  → fullContent 存入 DB
  → Phase 1: DeepSeek 结构提取 → extractedJson
  → Phase 2: DeepSeek 生成精简版 → condensedContent
  → 前端 AiAnalyzer 弹窗预览
  → 用户确认 → 存储 condensedContent + displayMode='both'
```

### 图片处理管线

```
DOCX byte array
  → mammoth convertImage（标准嵌入图片）→ /uploads/documents/{id}/{uuid}.png
  → JSZip word/media/ 兜底（WPS VML 图片）→ 同名映射
  → Step 3 清洗：alt 本地路径 → "图片"；src 本地路径 → JSZip 匹配或剥离
  → turndown → ![图片](path)
  → Nginx location /showroom/uploads/ → alias 直接 serve
```

### AI 智能解析（V3 两阶段）

**Phase 1** — 结构提取（`POST /api/documents/[id]/analyze`，内部第一步）：
- 提取 title, steps, approvalFlow, riskPoints, tables, images
- 每张图片绑定到对应 step（`imageRefs`），禁止孤立图片

**Phase 2** — 精简版生成（内部第二步）：
- 输出结构：文档概览 → 流程总览 → 系统入口 → 操作步骤 → 审核检查清单 → 高频错误 → 风险控制点 → 谁负责 → 场景FAQ
- 图片强制绑定：`[IMAGE_X]` 必须在所属步骤内，禁止堆在文末
- RACI 改为"谁负责"，仅在有明确信息时生成
- 禁止 AI 套话：首先/其次/最后/综上所述

### 上传文件静态服务

- `public/uploads/` 中的文件由 **Nginx 直接 serve**，不经过 Next.js
- Nginx 规则：`location /showroom/uploads/ { alias /var/www/yuan-showroom/public/uploads/; }`
- 必须放在 `location /showroom/` 前面（长前缀优先匹配）
- **原因**：Next.js production 在启动时构建静态文件路由表，运行时新增的 public/ 文件返回 404

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
- `fullContent`：DOCX 原文 Markdown（只读，不允许 AI 改写）
- `condensedContent`：AI 生成精简版（可编辑）
- `extractedJson`：Phase 1 结构提取结果（JSON 字符串）
- `displayMode`：`full` / `condensed` / `both`

---

## 六、关键页面路由

| 路由 | 功能 | 权限 |
|------|------|------|
| `/` | 品牌官网首页 | 公开 |
| `/login` | 员工登录 | 公开 |
| `/internal/dashboard` | 工作台（六屏） | 登录 |
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
- Phase 1（结构提取）：max_tokens 4096, temperature 0.3
- Phase 2（精简版生成）：max_tokens 8192, temperature 0.3
- AI 问答：SSE 流式，max_tokens 800，FTS5 检索增强

### 部署
- 本地构建 `.next` → `tar -czf` → `scp` → 服务器解压 → PM2 重启
- `prisma/dev.db` **不包含**在部署包中（服务器数据库独立）
- 部署后需执行 `npx prisma db push --accept-data-loss`（如有 Schema 变更）
- SSH Ed25519 免密登录

### Nginx 关键配置
```nginx
# uploads 必须在 /showroom/ proxy 之前（长前缀优先）
location /showroom/uploads/ {
    alias /var/www/yuan-showroom/public/uploads/;
}
location /showroom/ {
    proxy_pass http://127.0.0.1:3001/showroom/;
}
```

---

## 八、已知问题与根因记录

### 🐛 #1：图片上传后 404（已修复）

**现象**：DOCX 上传后，原文阅读页图片无法显示（404），PM2 重启后恢复正常。

**根因**：Next.js production 在启动时 snapshot `public/` 目录构建静态文件路由表，运行时通过 `writeFileSync` 新增的文件不在路由表中，始终返回 404。

**修复**：Nginx 新增 `location /showroom/uploads/` 直接 alias 到磁盘目录，绕过 Next.js static serving。见 [[#nginx-uploads-alias]]。

**教训**：Next.js `public/` 目录仅适用于构建时已知的静态资源。运行时动态生成的文件（如用户上传）必须由 Nginx 或 API Route 提供。

---

### 🐛 #2：WPS Office VML 图片本地路径泄露（已修复）

**现象**：用 WPS Office 创建的 DOCX，部分图片在 Markdown 中出现 `/Users/vv/Library/Containers/com.kingsoft.wpsoffice.mac/...` 本地路径。

**根因**：WPS Office 使用 VML (`v:imagedata`) 嵌入部分图片。mammoth 的 `convertImage` 能正常提取图片数据，但将 VML 中的本地路径放入了 `<img alt="...">` 属性。turndown 转换为 `![本地路径](正确路径)`。

**修复**：parser.ts Step 3 清洗所有 `<img>` 标签 — 检测 `alt` 中的本地路径，替换为 `alt="图片"`。见 [[#parser-step3]].

**教训**：不同 Office 套件（WPS vs MS Office）生成的 DOCX 内部结构差异大，VML 元素是 WPS 特有。需要在 mammoth 之后对 HTML 做二次清洗。

---

### 🐛 #3：JSZip 兜底文件名匹配失败（已修复）

**现象**：JSZip 成功提取 `word/media/image1.png`，但 WPS Photo Editor 临时文件名（如 `photoeditapp/202606051446...`）无法匹配 `imageMap`。

**根因**：WPS 内嵌 Photo Editor 给图片分配临时文件名，与 DOCX 内的 `word/media/imageN.png` 文件名不匹配。

**修复**：parser.ts Step 3 对无法匹配的本地路径直接剥离（返回空字符串），同时在 warnings 中记录缺失数量。

**教训**：文件名匹配只在常规场景下可靠。对于第三方编辑器生成的 DOCX，应优先依赖 mammoth 的 `convertImage` 回调（它按图片数据而非文件名工作）。

---

### 🐛 #4：上传表单可双重提交（已修复）

**现象**：极少数情况下文档列表中出现两条完全相同的文档记录。

**根因**：`handleUpload` 未检查 `upStatus !== 'idle'`，极端情况下（网络延迟、用户快速双击）可能触发两次 `prisma.document.create()`。

**修复**：在 `handleUpload` 函数入口添加 `if (upStatus !== 'idle') return` 防护。`documents/page.tsx` 和 `documents/upload/page.tsx` 均已修复。

**教训**：所有表单提交处理函数应在第一行检查状态，`disabled` 属性不足以防止异步场景下的重复提交。

---

### 🐛 #5：AI 生成内容出现乱码字符（已修复）

**现象**：AI 生成的精简版中出现 `�`、`￼`、`&nbsp;` 等乱码。

**根因**：DOCX 原文包含 Word 特殊字符（U+FFFC 对象替换符、U+FFFD 替换字符、零宽字符等），经 mammoth → turndown → DeepSeek 后未被清理。

**修复**：新增 `src/lib/sanitize.ts`，在 parser 输出、AI 输出、DB 存储三个环节调用 `sanitizeMarkdown()`，按字符码位过滤控制字符、零宽字符、BOM、HTML 实体。

**教训**：AI 管线应建立"输入清洗 → 处理 → 输出清洗"的闭环，清洗逻辑集中在单一模块复用，避免各环节重复实现。

---

## 九、本地开发

```bash
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

## 十、部署

```bash
npm run build
tar -czf /tmp/deploy.tar.gz --exclude='node_modules' --exclude='.git' \
  --exclude='prisma/dev.db' --exclude='.DS_Store' --exclude='.env.local' \
  .next package.json package-lock.json prisma public scripts ecosystem.config.js \
  next.config.js tsconfig.json tailwind.config.ts postcss.config.js
scp /tmp/deploy.tar.gz root@120.79.162.27:/tmp/
ssh root@120.79.162.27
cd /var/www/yuan-showroom && tar -xzf /tmp/deploy.tar.gz
npx prisma db push --accept-data-loss   # 如有 Schema 变更
pm2 restart yuan-showroom
```

## 十一、禁止事项

- ❌ 禁止用 SQLite 函数更新 `fullContent`（二进制损坏风险）
- ❌ 禁止在 `<Link>` 中写 `/showroom/` 前缀（造成双前缀 404）
- ❌ 禁止未经确认修改数据库 Schema
- ❌ `prisma/dev.db` 不随部署包上传
- ❌ 禁止 AI 改写 `fullContent` — 原文必须保持 95%+ Word 保真度
- ❌ 禁止将图片堆在文末 — 每张 `[IMAGE_X]` 必须在所属步骤内
- ❌ 禁止删除图片引用

## 十二、待办

- [ ] 搜索中文分词优化（FTS5 unicode61 → jieba/trigram）
- [ ] AI Chat 缓存层（避免重复问题重复计费）
- [ ] 图片 OCR 提取截图中的文字信息
- [ ] 质量审核自动化（上传后自动跑 quality-review.ts）
- [ ] 更多 DOCX 样本的批量质量测试
