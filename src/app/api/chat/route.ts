import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import Database from 'better-sqlite3'
import path from 'path'
import { prisma, getSessionFromCookies } from '@/lib/auth'

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db')
const MAX_PER_HOUR = 30

// Rate limiter: userId → { count, resetAt }
const rateLimit = new Map<string, { count: number; resetAt: number }>()

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
  })
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + 3600_000 })
    return true
  }
  if (entry.count >= MAX_PER_HOUR) return false
  entry.count++
  return true
}

function buildSSE(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session?.id) return new Response('Unauthorized', { status: 401 })

  if (!checkRateLimit(session.id)) {
    return new Response(JSON.stringify({ error: `每小时最多 ${MAX_PER_HOUR} 次提问` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { documentId, question } = body
  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: '请输入问题' }), { status: 400 })
  }

  // ── Retrieve relevant document snippets ──
  interface SearchHit { title: string; snippet: string; slug: string; audienceSlug: string; department: string }
  let hits: SearchHit[] = []

  if (documentId) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { ownerDept: { select: { name: true } }, audiences: { select: { department: { select: { slug: true } } }, take: 1 } },
    })
    if (doc) {
      const audienceSlug = doc.audiences[0]?.department.slug || 'marketing'
      hits = [{
        title: doc.title,
        snippet: (doc.fullContent || doc.content).substring(0, 4000),
        slug: doc.slug,
        audienceSlug,
        department: doc.ownerDept.name,
      }]
    }
  }

  // Cross-document FTS search (also runs for single doc to get more context)
  if (hits.length === 0 || !documentId) {
    const db = new Database(DB_PATH)
    try {
      const clean = question.replace(/['"*()^]/g, '')
      const ftsQuery = clean.includes(' ') ? clean.split(/\s+/).filter(Boolean).map((t: string) => `"${t}"`).join(' ') : clean

      const results = db.prepare(`
        SELECT d.title, COALESCE(NULLIF(d.fullContent,''), d.content) as content,
               d.slug, document_fts.audience_slug, document_fts.department
        FROM document_fts
        JOIN Document d ON document_fts.doc_id = d.id
        WHERE document_fts MATCH ?
        ORDER BY rank LIMIT 5
      `).all(ftsQuery) as any[]

      for (const r of results) {
        if (!hits.find(h => h.slug === r.slug)) {
          hits.push({
            title: r.title,
            snippet: (r.content || '').substring(0, 3000),
            slug: r.slug,
            audienceSlug: r.audience_slug || 'marketing',
            department: r.department || '',
          })
        }
      }
    } catch { /* FTS failed, use hits as-is */ } finally { db.close() }
  }

  // Fallback if no hits
  if (hits.length === 0) {
    const allDocs = await prisma.document.findMany({ where: { slug: { not: '' } }, take: 3,
      include: { ownerDept: { select: { name: true } }, audiences: { select: { department: { select: { slug: true } } }, take: 1 } } })
    hits = allDocs.map(d => ({
      title: d.title, snippet: d.fullContent.substring(0, 2000), slug: d.slug,
      audienceSlug: d.audiences[0]?.department.slug || 'marketing', department: d.ownerDept.name,
    }))
  }

  // ── Build context with source links ──
  const sourceList: string[] = []
  const context = hits.map((h, i) => {
    sourceList.push(h.title)
    const link = `/showroom/internal/docs/${h.audienceSlug}/${encodeURIComponent(h.slug)}`
    return `【来源${i + 1}：${h.title}】(${link})\n${h.snippet}`
  }).join('\n\n---\n\n')

  // ── Stream from DeepSeek ──
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send sources first
        controller.enqueue(encoder.encode(buildSSE({ type: 'sources', sources: sourceList })))

        const response = await getClient().chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是 YUAN SHOWROOM 内部知识库助手。请严格基于提供的文档内容回答问题，不要编造或推测文档中没有的信息。
规则：
1. 用中文回答，精简在 3-5 句话以内
2. 用要点形式呈现关键信息
3. 用自己的话概括，不要复述文档原文
4. 在回答末尾标注信息来源编号，如「来源：1、3」
5. 如果所有文档中都没有相关信息，请明确告知用户`,
            },
            { role: 'user', content: `参考以下知识库文档内容：\n\n${context}\n\n用户问题：${question}` },
          ],
          max_tokens: 800,
          temperature: 0.3,
          stream: true,
        })

        let fullAnswer = ''
        for await (const chunk of response) {
          const token = chunk.choices?.[0]?.delta?.content
          if (token) {
            fullAnswer += token
            controller.enqueue(encoder.encode(buildSSE({ type: 'token', content: token })))
          }
        }

        // Save to ChatLog
        try {
          await prisma.chatLog.create({
            data: { userId: session.id, question: question.trim(), answer: fullAnswer, sources: JSON.stringify(sourceList) },
          })
        } catch { /* silent */ }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
      } catch (err: any) {
        controller.enqueue(encoder.encode(buildSSE({ type: 'error', content: err.message || 'AI 服务不可用' })))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
