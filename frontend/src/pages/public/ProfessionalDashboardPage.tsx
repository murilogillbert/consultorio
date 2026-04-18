<<<<<<< HEAD
import { Navigate } from 'react-router-dom'

export default function ProfessionalDashboardPage() {
  return <Navigate to="/profissional" replace />
=======
import { Navigate, Link } from 'react-router-dom'
import { ArrowLeft, LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function ProfessionalDashboardPage() {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user?.role === 'PROFESSIONAL') {
    return <Navigate to="/profissional" replace />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--color-bg-primary)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        background: 'var(--color-bg-white)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 20,
        boxShadow: 'var(--shadow-elevated)',
        padding: '32px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(45,106,79,0.12)',
            color: 'var(--color-accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Portal do Profissional</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
              Acesso seguro ao painel profissional.
            </p>
          </div>
        </div>

        <p style={{ margin: '0 0 24px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          O acesso ao portal agora usa a autenticação principal do sistema. Entre com sua conta profissional e você será direcionado ao painel completo.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            to="/login"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <LogIn size={16} />
            Entrar
          </Link>

          <Link
            to="/"
            className="btn btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <ArrowLeft size={16} />
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  )
>>>>>>> d7793d1f090d3e773123b6abfd146d75425d0881
}
