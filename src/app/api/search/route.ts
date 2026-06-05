import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { getSessionFromCookies } from '@/lib/auth'

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db')

interface SearchResult {
  id: string
  title: string
  snippet: string
  department: string
  category: string
  slug: string
  audienceSlug: string
}

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const department = searchParams.get('department')?.trim()

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [], total: 0 })
  }

  const db = new Database(DB_PATH)
  db.exec('PRAGMA journal_mode=WAL')

  try {
    // Build FTS5 query — for Chinese, use simple term matching without quotes
    const clean = q.replace(/['"*()^]/g, '')
    const ftsQuery = clean.includes(' ')
      ? clean.split(/\s+/).filter(Boolean).map(t => `"${t}"`).join(' ')
      : clean

    let sql = `
      SELECT
        d.id,
        d.title,
        snippet(document_fts, 2, '<mark>', '</mark>', '…', 40) as title_highlight,
        snippet(document_fts, 3, '<mark>', '</mark>', '…', 60) as content_snippet,
        d.slug,
        document_fts.department,
        document_fts.type as category,
        document_fts.audience_slug
      FROM document_fts
      JOIN Document d ON document_fts.doc_id = d.id
      WHERE document_fts MATCH ?
    `

    const params: string[] = [ftsQuery]

    if (department) {
      sql += ` AND document_fts.department = ?`
      params.push(department)
    }

    sql += ` ORDER BY rank LIMIT 20`

    const results = db.prepare(sql).all(...params) as any[]

    const items: SearchResult[] = results.map((r: any) => ({
      id: r.id,
      title: r.title_highlight || r.title,
      snippet: r.content_snippet || '',
      department: r.department,
      category: r.category,
      slug: r.slug,
      audienceSlug: r.audience_slug || '',
    }))

    return NextResponse.json({ results: items, total: items.length })
  } catch (err: any) {
    // FTS syntax errors or empty results
    if (err.message?.includes('fts5')) {
      return NextResponse.json({ results: [], total: 0 })
    }
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  } finally {
    db.close()
  }
}
