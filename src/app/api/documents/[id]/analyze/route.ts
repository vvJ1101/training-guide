import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma, getSessionFromCookies } from '@/lib/auth'
import { canEditDocument } from '@/lib/permissions/documents'
import { sanitizeMarkdown } from '@/lib/sanitize'
import { PHASE1_SYSTEM_PROMPT } from '@/lib/prompts/phase1-extract'
import { validateOutput } from '@/lib/validator'

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

// ── Phase 2 V8: 极简条件驱动 ──
// Backups: V4 at phase2-v4-backup.ts, V6 at phase2-v6-backup.ts
const PHASE2_SYSTEM_PROMPT = `你是企业培训体系专家、SOP执行指南专家、企业知识库架构师。

任务：根据 fullContent 和 structuredJson，重构为新员工培训手册 + SOP执行指南。
目标：让员工无需阅读原文即可完成工作。

核心原则：
- 允许：结构化、分类、合并重复内容、提炼职责、流程抽象
- 禁止：虚构、猜测、补充不存在内容、输出空模块
- 禁止 AI 套话：首先、其次、最后、综上所述、值得注意的是

模块生成规则：先判断模块是否存在，存在才生成，不存在直接跳过。不要输出检测结果。

## 文档概览
始终生成。# 文档概览
- **用途**：一句话
- **适用部门/适用岗位/学习时间**

## 业务目标
仅当原文出现：业务目标 / 目标 / Purpose / Objective / 文档目的。禁止从 FAQ 或步骤推断。

## 审批链
≥2 审批节点。输出 Mermaid flowchart LR。

## 流程总览
≥3 步骤节点。输出 Mermaid flowchart TD。

## 对比矩阵
存在真实对比（现货/期货/云仓、角色对比、方案对比）。否则跳过。

## 决策树
出现 如果/否则/根据情况 分支逻辑。输出 Mermaid flowchart TD。

## 部门职责表
≥2 部门且有明确职责。否则跳过。

## 联系人表
出现 姓名+电话 或 负责人信息。优先于部门职责表。

## 系统入口
存在菜单/页面路径。**系统名** → 菜单 → 页面。

## 操作步骤
存在操作流程。
#### 步骤 N：名称
- **目标** / **进入路径** / **操作**：1. 2. 3. / **执行结果**
- **相关截图**：![描述](真实路径)

图片规则：
- 图片必须使用原文 fullContent 中的真实 Markdown 引用 ! [描述](path)
- 禁止 [IMAGE_1] [IMAGE_2] 占位符
- 自动绑定到距离最近的步骤
- 禁止集中在文末、禁止删除
- 生成后自查：outputImageCount == originalImageCount，不等重新生成

## 审核检查清单
出现 检查/确认/审核/核对。☐ 项目列表。

## 高频错误
出现 错误/注意事项/警告。格式：❌ 错误 / 原因 / ✅ 正确做法。至少 3 条。

## 风险控制点
出现 风险/违规/退回/影响。格式：风险点 / 影响 / 处理方式。

## 场景FAQ
Q+A 同时存在才生成。答案必须来自原文，找不到则删除该条。禁止 AI 补答案。

## 操作口诀
文档类型为 培训资料/操作手册/SOP 且步骤 ≥4 才生成。

## 输出
{"condensedContent":"...","analysisMeta":{"documentType":"","summary":"","targetAudience":[],"riskAlerts":[],"integrityScore":0}}
禁止 Markdown 代码块、禁止解释、禁止额外文字。`

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
    select: { id: true, title: true, fullContent: true, ownerDeptId: true, category: true },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // dept_admin: only own department's docs
  if (!canEditDocument(session, doc.ownerDeptId) && session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
  // Use body documentType > DB category > default
  const docTypeLabel = CATEGORY_TO_DOC_TYPE[documentType] || CATEGORY_TO_DOC_TYPE[doc.category] || documentType || '业务指南'

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

    // Phase 3: Validate output quality
    const validation = validateOutput(clean, content)

    return NextResponse.json({
      draft: clean,
      analysisMeta,
      extractedJson: extractedParsed,
      validation,
    })
  } catch (e: any) {
    console.error('AI analysis failed:', e?.message || e)
    return NextResponse.json({ error: 'AI analysis failed: ' + (e?.message || 'unknown') }, { status: 500 })
  }
}
