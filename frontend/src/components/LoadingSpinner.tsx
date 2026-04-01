import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
}

export default function LoadingSpinner({ message = 'Carregando...' }: LoadingSpinnerProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-12) var(--space-6)',
      color: 'var(--color-text-muted)',
      gap: 'var(--space-3)',
    }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 'var(--text-sm)' }}>{message}</p>
    </div>
  )
}
