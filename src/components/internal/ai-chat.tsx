'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Trash2, Zap, ExternalLink } from 'lucide-react'

interface ChatEntry { question: string; answer: string; sources: string[]; time: number }

interface AIChatProps { documentId?: string; documentTitle?: string }

const STORAGE_KEY = 'yuan_chat_history'
const MAX_HISTORY = 20

function loadHistory(): ChatEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveHistory(entries: ChatEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_HISTORY)))
}

// Generate quick questions based on document title/keywords
function quickQuestions(title?: string): string[] {
  if (!title || title.length < 3) return ['如何开始使用系统？', '云仓订单怎么处理？', '回款单审核要注意什么？']
  const qs: string[] = []
  if (/市场/.test(title)) {
    qs.push('云仓、现货、期货订单处理有什么区别？', '回款登记怎么做？', '余额支付如何操作？')
  } else if (/商品/.test(title)) {
    qs.push('怎么新建商品档案？', '什么时候做截单转采购？', '颜色/尺码建错了怎么办？')
  } else if (/财务/.test(title)) {
    qs.push('回款单审核要注意什么？', '余额混合支付怎么审核？', '月度核算怎么做？')
  } else if (/品牌方|ERP/.test(title)) {
    qs.push('聚水潭怎么同步库存？', '手动维护库存的步骤是什么？', '收到出货指令单怎么操作？')
  } else if (/品牌部|数据/.test(title)) {
    qs.push('怎么看某个品牌的确认订单？', '意向订单和确认订单有什么区别？', '怎么导出数据做分析？')
  }
  return qs.length > 0 ? qs : ['云仓订单怎么处理？', '回款单审核要注意什么？', '如何导出报表？']
}

export function AIChat({ documentId, documentTitle }: AIChatProps) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [streaming, setStreaming] = useState('')   // current streaming answer
  const [sources, setSources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<ChatEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)

  const qq = quickQuestions(documentTitle)

  // Load history on mount
  useEffect(() => { setHistory(loadHistory()) }, [open])

  // Scroll to bottom on streaming
  useEffect(() => {
    if (streaming && answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight
    }
  }, [streaming])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  async function ask(q?: string) {
    const qq = (q || question).trim()
    if (!qq || loading) return
    setLoading(true); setError(''); setStreaming(''); setSources([]); setQuestion('')

    try {
      const res = await fetch('/showroom/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: documentId || undefined, question: qq }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || `请求失败 (${res.status})`)
        setLoading(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullAnswer = ''
      let fullSources: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'token') {
              fullAnswer += parsed.content
              setStreaming(fullAnswer)
            } else if (parsed.type === 'sources') {
              fullSources = parsed.sources || []
              setSources(fullSources)
            } else if (parsed.type === 'error') {
              setError(parsed.content)
            }
          } catch { /* skip malformed lines */ }
        }
      }

      // Save to history
      const entry: ChatEntry = { question: qq, answer: fullAnswer, sources: fullSources, time: Date.now() }
      setHistory(prev => { const updated = [...prev, entry]; saveHistory(updated); return updated })
      setStreaming('')
    } catch {
      setError('网络错误，请重试')
    }
    setLoading(false)
  }

  function clearHistory() {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-neutral-800 transition-all flex items-center justify-center z-50"
        title="AI 问答"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-2 md:right-6 w-[calc(100vw-1rem)] max-w-[420px] bg-white border border-neutral-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between shrink-0">
            <div>
              <p className="text-[0.8rem] font-semibold text-neutral-900">AI 知识库问答</p>
              <p className="text-[0.65rem] text-neutral-400 font-normal mt-0.5 truncate max-w-[260px]">
                {documentId ? `当前文档：${(documentTitle || '').substring(0, 30)}` : '搜索全部文档'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors rounded" title="历史记录">
                {showHistory ? <X size={14} /> : <MessageCircle size={14} />}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors rounded">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Quick questions (when no answer shown) */}
          {!streaming && !loading && !error && history.length === 0 && (
            <div className="px-5 py-3 border-b border-neutral-100 shrink-0">
              <p className="text-[0.65rem] text-neutral-400 font-medium mb-2 flex items-center gap-1"><Zap size={12} /> 快捷提问</p>
              <div className="flex flex-wrap gap-1.5">
                {qq.map((q, i) => (
                  <button key={i} onClick={() => ask(q)} disabled={loading}
                    className="text-left px-2.5 py-1.5 text-[0.7rem] bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 transition-colors font-normal">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat area */}
          <div ref={answerRef} className="flex-1 overflow-y-auto px-5 py-3 min-h-[120px]">
            {/* History */}
            {showHistory && history.length > 0 && (
              <div className="mb-3 pb-3 border-b border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[0.65rem] text-neutral-400 font-medium">历史记录 ({history.length})</p>
                  <button onClick={clearHistory} className="text-[0.62rem] text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={10} />清空</button>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {[...history].reverse().slice(0, 10).map((entry, i) => (
                    <button key={i} onClick={() => { setStreaming(entry.answer); setSources(entry.sources); setShowHistory(false) }}
                      className="w-full text-left px-2.5 py-1.5 rounded text-[0.72rem] text-neutral-600 hover:bg-neutral-50 transition-colors font-normal truncate">
                      Q: {entry.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && !streaming && (
              <div className="flex items-center gap-2 text-[0.78rem] text-neutral-400 py-2">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            )}

            {/* Error */}
            {error && <p className="text-[0.78rem] text-red-600 py-2">{error}</p>}

            {/* Answer (streaming or from history) */}
            {(streaming || (!loading && !error && history.length > 0 && !showHistory)) && (
              <div>
                <div className="text-[0.82rem] leading-[1.8] text-neutral-700 font-normal whitespace-pre-wrap">
                  {streaming || history[history.length - 1]?.answer || ''}
                  {loading && streaming && <span className="inline-block w-2 h-4 bg-neutral-900 animate-pulse ml-0.5 align-middle" />}
                </div>

                {/* Sources */}
                {sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <p className="text-[0.62rem] text-neutral-400 font-medium mb-1.5">参考来源</p>
                    <div className="flex flex-wrap gap-1">
                      {sources.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[0.62rem] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-normal">
                          {s.substring(0, 20)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!loading && !streaming && !error && history.length === 0 && (
              <p className="text-[0.78rem] text-neutral-400 text-center py-6">点击上方快捷问题或输入提问</p>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-neutral-100 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ask()}
              placeholder="输入问题..."
              disabled={loading}
              className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-[0.8rem] focus:outline-none focus:border-neutral-400 transition-colors font-normal disabled:bg-neutral-50"
            />
            <button onClick={() => ask()} disabled={loading || !question.trim()}
              className="px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center gap-1">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
