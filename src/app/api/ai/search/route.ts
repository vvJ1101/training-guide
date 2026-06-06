import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Database from 'better-sqlite3'
import path from 'path'
import { getSessionFromCookies } from '@/lib/auth'
import { buildDocumentWhere } from '@/lib/permissions/documents'
import { prisma } from '@/lib/prisma'

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db')

type Intent = 'question' | 'document' | 'sop' | 'howto'

function getAIClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
  })
}

const INTENT_PROMPT = `Classify the user query into exactly one intent. Reply with ONLY the word.

Intents:
- question: factual answer or explanation (what/why/when)
- document: searching for a document by name
- sop: business process or workflow
- howto: how to perform an action

Examples:
"什么是云仓" → question
"如何申请报销" → howto
"订货会流程" → sop
"员工手册" → document

Query: `

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query } = await req.json().catch(() => ({}))
  if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  const q = query.trim()

  // Step 1: FTS search (always get document context)
  const ftsDocs = await ftsSearch(q, session)

  // Step 2: Intent classification
  let intent: Intent = 'document'
  try {
    const client = getAIClient()
    const res = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: INTENT_PROMPT + q }],
      max_tokens: 10,
      temperature: 0,
    })
    const raw = (res.choices[0]?.message?.content || '').trim().toLowerCase()
    if (['question', 'document', 'sop', 'howto'].includes(raw)) intent = raw as Intent
  } catch { /* fallback to document */ }

  // Step 3: Build response by intent
  const topDoc = ftsDocs[0]

  if (intent === 'question') {
    return NextResponse.json({
      intent: 'question',
      summary: `关于「${q}」`,
      documents: ftsDocs.slice(0, 3),
    })
  }

  if (intent === 'sop' || intent === 'howto') {
    return NextResponse.json({
      intent,
      summary: topDoc ? `根据「${topDoc.title}」的流程指引` : `搜索「${q}」的结果`,
      primaryDoc: topDoc || null,
      documents: ftsDocs.slice(0, 4),
    })
  }

  return NextResponse.json({
    intent: 'document',
    summary: ftsDocs.length > 0 ? `找到 ${ftsDocs.length} 篇相关文档` : '未找到相关文档',
    documents: ftsDocs.slice(0, 5),
  })
}

// ── FTS + Permission Filter ──
async function ftsSearch(q: string, session: any) {
  const db = new Database(DB_PATH)
  try {
    const clean = q.replace(/['"*()^]/g, '')
    const ftsQuery = clean.includes(' ')
      ? clean.split(/\s+/).filter(Boolean).map(t => `"${t}"`).join(' ')
      : clean

    const sql = `
      SELECT d.id, d.title, d.slug, d.ownerDeptId,
        snippet(document_fts, 2, '', '', '…', 30) as content_snippet,
        document_fts.department, document_fts.type as category,
        document_fts.audience_slug
      FROM document_fts JOIN Document d ON document_fts.doc_id = d.id
      WHERE document_fts MATCH ?
      ORDER BY rank LIMIT 10
    `
    const results = db.prepare(sql).all(ftsQuery) as any[]
    if (!results.length) return []

    // Permission filter
    const where = buildDocumentWhere(session)
    const allIds = results.map((r: any) => r.id)

    if (Object.keys(where).length === 0) {
      // super_admin: all results pass
      return results.map(formatResult)
    }

    const accessible = await prisma.document.findMany({
      where: { ...where, id: { in: allIds } },
      select: { id: true },
    })
    const allowedSet = new Set(accessible.map(d => d.id))

    return results
      .filter((r: any) => allowedSet.has(r.id))
      .map(formatResult)
  } catch {
    return []
  } finally {
    db.close()
  }
}

function formatResult(r: any) {
  return {
    id: r.id,
    title: r.title,
    snippet: r.content_snippet || '',
    department: r.department,
    category: r.category,
    slug: r.slug,
    audienceSlug: r.audience_slug || '',
  }
}
