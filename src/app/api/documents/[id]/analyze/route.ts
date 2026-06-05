import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma, getSessionFromCookies, getVisibleDeptIds } from '@/lib/auth'

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

const SYSTEM_PROMPT = `你是企业知识管理专家、流程管理顾问和培训体系设计专家。

你的任务是将企业上传的文档转换为：
1. 适合员工阅读的结构化精简版文档（condensedContent）
2. AI 分析元数据（analysisMeta：风险提示、完整性评分等）

## 输出格式（严格遵守）

必须返回合法 JSON。禁止 Markdown 代码块。禁止额外文字。

{
  "condensedContent": "(Markdown 格式的精简版文档)",
  "analysisMeta": {
    "documentType": "SOP流程",
    "summary": "50字以内总结",
    "targetAudience": ["部门A", "部门B"],
    "estimatedReadMinutes": 10,
    "riskAlerts": ["风险1", "风险2"],
    "integrityScore": 85,
    "strengths": ["优点1", "优点2"],
    "weaknesses": ["不足1", "不足2"]
  }
}

## condensedContent 生成规则

condensedContent 是给员工阅读的纯净 Markdown。目标：提高阅读效率、保留核心知识、支持 Markdown 渲染和块级编辑。

**严禁在 condensedContent 中出现：** 风险提示、完整性评分、文档评价、AI 分析意见、优点、缺点、评分结果、优化建议。这些内容只能进入 analysisMeta。

按以下顺序生成（没有内容的模块跳过）：

### 1. 文档摘要
- 一句话总结
- **适用对象**：（部门/岗位）
- **预计阅读时间**：约 X 分钟

### 2. 核心流程图
如果文档包含流程，用 Mermaid flowchart TD 语法生成。不存在流程则跳过。

### 3. 流程步骤拆解
每个步骤：
- **Step N - 步骤名称**
  - 目标：...
  - 执行人：（部门/岗位）
  - 输入资料：...
  - 输出结果：...
  - 完成标准：...

### 4. 关键知识点
提炼核心规则、时间要求、业务要求、审批要求，条目化输出。

### 5. 操作要点
拆分为：✅ 必须执行 / ⚠️ 注意事项 / ❌ 禁止行为

### 6. 责任矩阵
如果存在多个角色/部门，用 Markdown 表格输出 RACI 矩阵（R=执行/A=负责/C=咨询/I=知情）。

### 7. FAQ
生成 5~10 条常见问题，格式：
**Q1: 问题？**
A: 回答...
**Q2: 问题？**
A: 回答...

## analysisMeta 生成规则

- **documentType**：从"SOP流程/制度规范/培训资料/操作手册/业务指南/其他"中选择
- **summary**：50字以内
- **targetAudience**：自动识别适用部门，数组格式
- **estimatedReadMinutes**：根据内容长度估算，数字类型
- **riskAlerts**：仅分析原文存在的问题，不得编造。如无问题返回空数组 []
- **integrityScore**：0-100 数字，综合评估流程完整度(30%)、责任明确度(25%)、时间节点完整度(20%)、规则明确度(15%)、风险控制完整度(10%)
- **strengths**：列出文档优势，数组格式
- **weaknesses**：列出文档不足，数组格式

## 重要约束
- 不得修改原文事实，不得创造原文不存在的制度
- 数字、时间节点、部门名称必须与原文一致
- 流程图必须根据原文内容生成
- condensedContent 与 analysisMeta 的内容不得重叠
- 输出纯 JSON，不要用 \`\`\`json 包裹`

// ── JSON extraction & validation ──
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

interface AnalysisResult {
  draft: string
  analysisMeta: AnalysisMeta | null
}

function extractJson(raw: string): string {
  // Strip code fences if present
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }
  // Find the outermost { ... }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) {
    s = s.substring(start, end + 1)
  }
  return s
}

function parseAnalysisResult(raw: string): AnalysisResult {
  const json = extractJson(raw)
  let parsed: any
  try {
    parsed = JSON.parse(json)
  } catch {
    // If JSON parse fails, treat the entire raw as a Markdown draft (fallback)
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
  // Remove meta-commentary lines that may have leaked into the draft
  return draft
    .split('\n')
    .filter(line => {
      const kw = /^(检测到|缺失|建议补充|🔍|逻辑缺失|流程不闭环|优化建议)/
      return !kw.test(line.trim())
    })
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

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

  // dept_admin: only own company's docs
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

  // Build user prompt
  let userPrompt = `## 文档类型：${docTypeLabel}\n\n## 原文标题：${doc.title}\n\n## 原文内容：\n${content.substring(0, 12000)}`
  if (feedback) {
    userPrompt += `\n\n## 用户补充意见：\n${feedback}`
  }
  userPrompt += `\n\n---\n请严格按照 JSON 格式输出，不要用 \`\`\`json 代码块包裹。`

  // Call DeepSeek
  try {
    const client = getClient()
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content || ''

    // Parse JSON response
    const result = parseAnalysisResult(raw)

    // Sanitize draft
    const draft = sanitizeDraft(result.draft)

    return NextResponse.json({
      draft,
      analysisMeta: result.analysisMeta,
    })
  } catch (e: any) {
    console.error('AI analysis failed:', e?.message || e)
    return NextResponse.json({ error: 'AI analysis failed: ' + (e?.message || 'unknown') }, { status: 500 })
  }
}
