import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookies, canEditPolicy } from '@/lib/auth'
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies(req.headers.get('cookie'))
  if (!session?.id || !canEditPolicy(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '请选择文件' }, { status: 400 })

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return NextResponse.json({ error: 'Excel 文件为空' }, { status: 400 })

    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
    if (rows.length < 2) return NextResponse.json({ error: '数据不足' }, { status: 400 })

    const headers = rows[1] // Second row is the header
    const policies: Record<string, string>[] = []

    for (let i = 2; i < rows.length; i++) {
      const r = rows[i]
      if (!r || !r[2]) continue
      policies.push({
        category: String(r[0] || '').trim(),
        country: String(r[1] || '').trim(),
        brand: String(r[2] || '').trim(),
        style: String(r[3] || '').trim(),
        priceRange: String(r[4] || '').trim(),
        series: String(r[5] || '').trim(),
        ss26: String(r[6] || '').trim(),
        aw26: String(r[7] || '').trim(),
        delivery: String(r[8] || '').trim(),
        nonCutoff: String(r[9] || '').trim(),
        pr: String(r[10] || '').trim(),
      })
    }

    const outDir = join(process.cwd(), 'public', 'data')
    mkdirSync(outDir, { recursive: true })
    const outPath = join(outDir, 'policies.json')

    // Backup old version
    const backupPath = join(outDir, 'policies.backup.json')
    if (existsSync(outPath)) {
      copyFileSync(outPath, backupPath)
    }
    writeFileSync(outPath, JSON.stringify(policies, null, 2), 'utf-8')
    // Store update timestamp
    writeFileSync(join(outDir, 'policies.updated.json'), JSON.stringify({ updatedAt: new Date().toISOString() }), 'utf-8')

    return NextResponse.json({
      ok: true,
      count: policies.length,
      brands: policies.map(p => p.brand),
      updatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: `解析失败: ${err.message}` }, { status: 500 })
  }
}
