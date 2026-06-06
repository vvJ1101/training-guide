import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma, getSessionFromCookies, getVisibleDeptIds } from '@/lib/auth'
import { sanitizeMarkdown } from '@/lib/sanitize'
import { PHASE1_SYSTEM_PROMPT } from '@/lib/prompts/phase1-extract'

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
  })
}

const CATEGORY_TO_DOC_TYPE: Record<string, string> = {
  sop: 'SOP流程',
  reference: '制度规范',
  training: '培训资料',
  brand: '业务指南',
}

// ── Phase 2 System Prompt V3: 新员工培训手册 + SOP执行指南 ──
const PHASE2_SYSTEM_PROMPT = `你是企业培训手册编写专家和 SOP 执行指南设计专家。

你的任务：将企业文档改写为"新员工培训手册 + SOP执行指南"，而不是文档摘要。

目标受众：新员工、需要按步骤完成操作的员工、培训主管。

## 输出格式

必须返回合法 JSON。禁止 Markdown 代码块。禁止额外文字。

{
  "condensedContent": "(Markdown)",
  "analysisMeta": {
    "documentType": "SOP流程",
    "summary": "50字以内",
    "targetAudience": ["部门A"],
    "estimatedReadMinutes": 10,
    "riskAlerts": [],
    "integrityScore": 85,
    "strengths": [],
    "weaknesses": []
  }
}

## condensedContent 结构（严格按顺序，无内容则跳过）

### # 文档概览
- **用途**：一句话说明本文档用来做什么
- **适用部门**：...
- **适用岗位**：...
- **预计学习时间**：约 X 分钟

### # 流程总览
Mermaid flowchart TD。如果原文无流程则跳过。

### # 系统入口
提取所有系统名称和菜单路径，格式：
- **系统名**
  - → 菜单路径1
  - → 菜单路径2

例如：**联欣系统** → 主题订单 → 订单审核

如果原文无系统路径则跳过。

### # 操作步骤

每个步骤格式：

#### 步骤 N：步骤名称

- **目标**：...
- **进入路径**：系统 → 菜单 → 页面
- **操作**：
  1. 第一步
  2. 第二步
  3. 第三步
- **执行结果**：...
- **相关截图**：[IMAGE_X]

**图片-步骤绑定规则（强制执行，违反判定为解析失败）**：
- 原文中每张图片 MUST 绑定到对应的操作步骤内
- [IMAGE_X] 必须出现在步骤的"相关截图"行，X 为图片在原文中的出现顺序（1, 2, 3...）
- 每张图片至少绑定一个 step，禁止孤立图片（orphan images）
- 禁止将所有图片堆在文末——必须在各自步骤内
- 禁止删除图片引用
- 禁止改变图片顺序

**绑定验证（自查）**：
生成完成后自查：步骤中出现的 [IMAGE_X] 总数是否等于原文图片总数？不等则必须补齐。

### # 审核检查清单

对关键操作生成检查清单，格式：

**XX操作前检查**：
- ☐ 检查项1
- ☐ 检查项2
- ☐ 检查项3

至少生成 1 个检查清单。原文没有检查项时根据操作步骤反向生成。

### # 高频错误

列出员工最容易犯的错误，格式：

**❌ 错误**：...
**原因**：...
**✅ 正确做法**：...

至少列出 3 条（如果原文有相关描述）。

### # 风险控制点

格式：

- **风险点**：...
  - **影响**：...
  - **处理方式**：...

原文无风险描述则跳过。

### # 谁负责

简单列出角色和职责，不要用 RACI 矩阵。格式：

- **XX操作**：部门名
- **XX审核**：部门名
- **XX审批**：部门名

只列原文明确提到的责任分配。不完整的跳过不列。

### # 场景FAQ

生成 5~8 条真实业务场景问答。不要机械重复原文。格式：

**Q: 具体业务场景问题？**
A: 具体操作指引...

问题必须是员工在实际工作中会遇到的场景。例如：
- "客户只付了订金怎么办？"
- "审核不通过怎么处理？"
- "订单取消后如何退款？"

## condensedContent 禁止事项

- ❌ 禁止出现 AI 套话：首先、其次、最后、综上所述、值得注意的是、以下内容、总结如下
- ❌ 禁止出现分析意见：检测到、缺失、建议补充、优化建议
- ❌ 禁止总结原文、禁止评价原文
- ❌ 禁止删除图片引用 [IMAGE_X]
- ❌ 禁止把多级编号扁平化

## analysisMeta 规则（不变）
- documentType：SOP流程/制度规范/培训资料/操作手册/业务指南/其他
- summary：50字以内
- riskAlerts：仅分析原文存在的风险
- integrityScore：0-100，综合评估

## 核心原则
- 新员工无需阅读原文即可理解流程
- 新员工可以按步骤完成操作
- 培训主管可直接用于培训
- 输出纯 JSON，不要用代码块包裹`

// ── JSON helpers ──
interface AnalysisMeta {
  documentType: string
  summary: string
  targetAudience: string[]
  estimatedReadMinutes: number
  riskAlerts: string[]
  integrityScore: number
  strengths: string[]
  weaknesses: string[]
}

function extractJson(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) {
    s = s.substring(start, end + 1)
  }
  return s
}

function parsePhase2Result(raw: string): { draft: string; analysisMeta: AnalysisMeta | null } {
  const json = extractJson(raw)
  let parsed: any
  try { parsed = JSON.parse(json) } catch {
    return { draft: raw.trim(), analysisMeta: null }
  }

  const condensedContent = typeof parsed.condensedContent === 'string' ? parsed.condensedContent.trim() : ''
  const meta = parsed.analysisMeta || {}

  const analysisMeta: AnalysisMeta = {
    documentType: typeof meta.documentType === 'string' ? meta.documentType : '业务指南',
    summary: typeof meta.summary === 'string' ? meta.summary : '',
    targetAudience: Array.isArray(meta.targetAudience) ? meta.targetAudience.filter((s: any) => typeof s === 'string') : [],
    estimatedReadMinutes: typeof meta.estimatedReadMinutes === 'number' ? meta.estimatedReadMinutes : 0,
    riskAlerts: Array.isArray(meta.riskAlerts) ? meta.riskAlerts.filter((s: any) => typeof s === 'string') : [],
    integrityScore: typeof meta.integrityScore === 'number' ? Math.max(0, Math.min(100, meta.integrityScore)) : 0,
    strengths: Array.isArray(meta.strengths) ? meta.strengths.filter((s: any) => typeof s === 'string') : [],
    weaknesses: Array.isArray(meta.weaknesses) ? meta.weaknesses.filter((s: any) => typeof s === 'string') : [],
  }

  return { draft: condensedContent, analysisMeta }
}

function sanitizeDraft(draft: string): string {
  let cleaned = draft
    .split('\n')
    .filter(line => {
      const kw = /^(检测到|缺失|建议补充|🔍|逻辑缺失|流程不闭环|优化建议)/
      return !kw.test(line.trim())
    })
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
  return sanitizeMarkdown(cleaned)
}

// ── POST handler: Two-phase pipeline ──
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Auth
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Load document
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, fullContent: true, ownerDeptId: true },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.role === 'dept_admin') {
    const deptIds = await getVisibleDeptIds(session)
    if (!deptIds.includes(doc.ownerDeptId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const content = doc.fullContent || ''
  if (!content.trim()) {
    return NextResponse.json({ error: 'Document has no content' }, { status: 400 })
  }

  // Parse request body
  let feedback = ''
  let documentType = ''
  try {
    const body = await req.json().catch(() => ({}))
    feedback = body.feedback || ''
    documentType = body.documentType || ''
  } catch {}
  const docTypeLabel = CATEGORY_TO_DOC_TYPE[documentType] || documentType || '业务指南'

  const client = getClient()
  const contentSnippet = content.substring(0, 12000)
  const regenHint = feedback ? `\n## 用户补充意见：\n${feedback}` : ''

  try {
    // ── Phase 1: Structure Extraction ──
    let extractedJson = ''
    let extractedParsed: any = null

    try {
      const p1 = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: PHASE1_SYSTEM_PROMPT },
          { role: 'user', content: `## 文档类型：${docTypeLabel}\n\n## 原文标题：${doc.title}\n\n## 原文内容：\n${contentSnippet}\n\n---\n请严格按照 JSON 格式输出，不要用代码块包裹。` },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      })
      const p1Raw = p1.choices[0]?.message?.content || ''
      try {
        extractedParsed = JSON.parse(extractJson(p1Raw))
        extractedJson = JSON.stringify(extractedParsed)
      } catch {
        extractedJson = p1Raw.trim() // fallback: store raw if not valid JSON
      }
    } catch (e: any) {
      console.error('Phase 1 failed:', e?.message || e)
      extractedJson = ''
    }

    // Store Phase 1 result in DB
    if (extractedJson) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { extractedJson },
      }).catch(() => {})
    }

    // ── Phase 2: Condensed Generation ──
    // Include extracted structure as context if available
    let phase2Context = ''
    if (extractedParsed) {
      const ctx = {
        title: extractedParsed.title,
        steps: extractedParsed.steps?.length,
        departments: extractedParsed.applicableDepartments,
        purpose: extractedParsed.purpose,
      }
      phase2Context = `\n\n## 已提取的文档结构（仅供参考，不要照抄）：\n${JSON.stringify(ctx, null, 2)}`
    }

    const p2 = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: PHASE2_SYSTEM_PROMPT },
        { role: 'user', content: `## 文档类型：${docTypeLabel}\n\n## 原文标题：${doc.title}\n\n## 原文内容：\n${contentSnippet}${phase2Context}${regenHint}\n\n---\n请严格按照 JSON 格式输出，不要用代码块包裹。` },
      ],
      max_tokens: 8192,
      temperature: 0.3,
    })

    const p2Raw = p2.choices[0]?.message?.content || ''
    const { draft, analysisMeta } = parsePhase2Result(p2Raw)
    const clean = sanitizeDraft(draft)

    // Store condensed result in DB
    if (clean) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { condensedContent: clean, displayMode: 'both' },
      }).catch(() => {})
    }

    return NextResponse.json({
      draft: clean,
      analysisMeta,
      extractedJson: extractedParsed,
    })
  } catch (e: any) {
    console.error('AI analysis failed:', e?.message || e)
    return NextResponse.json({ error: 'AI analysis failed: ' + (e?.message || 'unknown') }, { status: 500 })
  }
}
