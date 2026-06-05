import { AuthGuard } from '@/components/internal/auth-guard'

export default function PolicyUploadLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireRole={['super_admin', 'dept_admin']}>{children}</AuthGuard>
}
