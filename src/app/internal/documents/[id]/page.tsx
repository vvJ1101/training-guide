'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function DocumentRedirectPage() {
  const { id } = useParams()
  const router = useRouter()

  useEffect(() => {
    if (!id) return
    fetch(`/showroom/api/documents/${id}`)
      .then(r => r.json())
      .then(doc => {
        if (doc?.id) {
          const audienceSlug = doc.audiences?.[0]?.department?.slug || doc.ownerDept?.slug
          const slug = encodeURIComponent(doc.slug || doc.title)
          router.replace(`/internal/docs/${audienceSlug}/${slug}`)
        } else {
          router.replace('/internal/documents')
        }
      })
      .catch(() => router.replace('/internal/documents'))
  }, [id, router])

  return (
    <div className="p-10 text-center text-[0.85rem] text-neutral-400">
      跳转中...
    </div>
  )
}
