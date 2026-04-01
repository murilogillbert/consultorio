import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
}

export default function EmptyState({
  icon,
  title = 'Nenhum item encontrado',
  description = 'Não há dados para exibir no momento.'
}: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-12) var(--space-6)',
      color: 'var(--color-text-muted)',
      gap: 'var(--space-3)',
      textAlign: 'center',
    }}>
      <div style={{ opacity: 0.5 }}>
        {icon || <Inbox size={48} />}
      </div>
      <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
        {title}
      </h3>
      <p style={{ fontSize: 'var(--text-sm)', maxWidth: 320 }}>
        {description}
      </p>
    </div>
  )
}
