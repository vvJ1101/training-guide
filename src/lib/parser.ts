import mammoth from 'mammoth'
import JSZip from 'jszip'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads', 'documents')

export async function parseDocx(buffer: Buffer, documentId?: string): Promise<{
  markdown: string
  imageCount: number
  warnings: string[]
}> {
  // Step 1: Extract images from DOCX ZIP
  const imageMap = new Map<string, string>()
  const docDir = documentId ? join(UPLOADS_DIR, documentId) : join(UPLOADS_DIR, 'temp')

  try {
    const zip = await JSZip.loadAsync(buffer)
    const mediaFiles = Object.keys(zip.files).filter(
      (f) => f.startsWith('word/media/') && !f.endsWith('/')
    )

    if (!existsSync(docDir)) mkdirSync(docDir, { recursive: true })

    for (const mediaPath of mediaFiles) {
      const file = zip.files[mediaPath]
      if (!file) continue
      const ext = mediaPath.split('.').pop() || 'png'
      const filename = `${uuidv4()}.${ext}`
      const fileData = await file.async('nodebuffer')
      writeFileSync(join(docDir, filename), fileData)
      const relId = mediaPath.replace('word/media/', '')
      imageMap.set(relId, `/uploads/documents/${documentId || 'temp'}/${filename}`)
    }
  } catch { /* not a valid ZIP or no images */ }

  // Step 2: Convert with mammoth
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) => {
        return image.read().then((imgBuffer) => {
          const ext = (image.contentType || 'image/png').replace('image/', '')
          const filename = `${uuidv4()}.${ext}`
          if (!existsSync(docDir)) mkdirSync(docDir, { recursive: true })
          writeFileSync(join(docDir, filename), imgBuffer)
          return { src: `/uploads/documents/${documentId || 'temp'}/${filename}` }
        })
      }),
    }
  )

  // Step 3: Convert HTML to Markdown — minimal, clean
  const markdown = htmlToMarkdown(result.value)

  return {
    markdown,
    imageCount: imageMap.size,
    warnings: result.messages.map((m) => m.message),
  }
}

function htmlToMarkdown(html: string): string {
  let md = html

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, (_, src) => {
    if (src.startsWith('data:')) return ''
    return `\n\n![image](${src})\n\n`
  })

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_, t) => `\n\n# ${stripHtml(t)}\n\n`)
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_, t) => `\n\n## ${stripHtml(t)}\n\n`)
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_, t) => `\n\n### ${stripHtml(t)}\n\n`)
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, (_, t) => `\n\n#### ${stripHtml(t)}\n\n`)
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, (_, t) => `\n\n##### ${stripHtml(t)}\n\n`)
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, (_, t) => `\n\n###### ${stripHtml(t)}\n\n`)

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, (_, t) => {
    const text = stripHtml(t)
    return text ? `\n${text}\n` : ''
  })

  // Bold & italic
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, t) => `- ${stripHtml(t)}\n`)

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n')

  // Entities
  md = md.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')

  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, '')

  // Collapse whitespace
  md = md.replace(/\n{3,}/g, '\n\n').trim()

  return md
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
}
