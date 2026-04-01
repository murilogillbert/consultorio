import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, MessageSquare, Users, Stethoscope,
  Settings, BarChart3, TrendingUp, DollarSign, Megaphone, Activity,
  LogOut, Bell, MessageCircle, Shield
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface InternalLayoutProps {
  environment: 'reception' | 'admin'
}

function ClinicLogoMini() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#2D6A4F" />
      <path d="M20 10v20M10 20h20" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

const receptionLinks = [
  { to: '/recepcao', icon: LayoutDashboard, label: 'Visão Geral', end: true },
  { to: '/recepcao/agenda', icon: CalendarDays, label: 'Agenda' },
  { to: '/recepcao/mensagens', icon: MessageSquare, label: 'Mensagens', badge: 3 },
  { to: '/recepcao/profissionais', icon: Users, label: 'Profissionais' },
  { to: '/recepcao/servicos', icon: Stethoscope, label: 'Serviços' },
]

const adminLinks = [
  { section: 'PRINCIPAL' },
  { to: '/admin', icon: LayoutDashboard, label: 'Visão Geral', end: true },
  { section: 'GERENCIAR' },
  { to: '/admin/profissionais', icon: Users, label: 'Profissionais' },
  { to: '/admin/servicos', icon: Stethoscope, label: 'Serviços' },
  { to: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
  { section: 'ANALYTICS' },
  { to: '/admin/metricas/profissionais', icon: BarChart3, label: 'Métr. Profissionais' },
  { to: '/admin/metricas/servicos', icon: TrendingUp, label: 'Métr. Serviços' },
  { to: '/admin/faturamento', icon: DollarSign, label: 'Faturamento' },
  { to: '/admin/marketing', icon: Megaphone, label: 'Marketing' },
  { to: '/admin/movimento', icon: Activity, label: 'Movimento' },
]

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTIONIST: 'Recepcionista',
  PROFESSIONAL: 'Profissional',
  PATIENT: 'Paciente',
}

export default function InternalLayout({ environment }: InternalLayoutProps) {
  const links = environment === 'reception' ? receptionLinks : adminLinks
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const userName = user?.name || 'Usuário'
  const userRole = user?.role ? roleLabels[user.role] : ''

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  return (
    <div className="internal-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <ClinicLogoMini />
          <span>Vitalis</span>
        </div>

        <nav className="sidebar-nav">
          {links.map((item, i) => {
            if ('section' in item) {
              return (
                <div key={i} className="sidebar-section-title">
                  {item.section}
                </div>
              )
            }
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {item.badge && <span className="badge-count">{item.badge}</span>}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-user">
          <div className="avatar avatar-sm avatar-placeholder">
            {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="sidebar-user-info">
            <div className="name">{userName}</div>
            <div className="role">
              {environment === 'admin' && <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />}
              {userRole}
            </div>
          </div>
          <button className="logout-btn" title="Sair" onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <h1 className="topbar-title">
            {environment === 'reception' ? 'Recepção' : 'Administração'}
          </h1>
          <div className="topbar-actions">
            <button className="topbar-icon-btn" title="Notificações">
              <Bell size={20} />
              <span className="badge-count">5</span>
            </button>
            <button className="topbar-icon-btn" title="Chat Interno">
              <MessageCircle size={20} />
              <span className="badge-count">2</span>
            </button>
            <div className="avatar avatar-sm avatar-placeholder" style={{ cursor: 'pointer' }}>
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="mobile-bottombar">
        {(environment === 'reception' ? receptionLinks : adminLinks.filter(l => 'to' in l).slice(0, 5)).map((item) => {
          if ('section' in item) return null
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
