import { AuthGuard } from '@/components/internal/auth-guard'
import { InternalLayoutClient } from '@/components/internal/internal-layout-client'

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <InternalLayoutClient>{children}</InternalLayoutClient>
    </AuthGuard>
  )
}
