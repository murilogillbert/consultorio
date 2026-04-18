import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, MessageSquare, Users, Stethoscope,
  Settings, BarChart3, TrendingUp, DollarSign, Megaphone, Activity,
  LogOut, Bell, MessageCircle, Shield, ChevronDown, Menu, X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useMyClinic } from '../hooks/useClinics'
import { useConversations } from '../hooks/useConversations'
import { useAppointments } from '../hooks/useAppointments'

interface InternalLayoutProps {
  environment: 'reception' | 'admin'
}

function ClinicLogoMini({ logoUrl }: { logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
  }
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
  { to: '/recepcao/mensagens', icon: MessageSquare, label: 'Mensagens' },
  { to: '/recepcao/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/recepcao/profissionais', icon: Users, label: 'Profissionais' },
  { to: '/recepcao/servicos', icon: Stethoscope, label: 'Serviços' },
]

const adminLinks = [
  { section: 'PRINCIPAL' },
  { to: '/admin', icon: LayoutDashboard, label: 'Visão Geral', end: true },
  { section: 'GERENCIAR' },
  { to: '/admin/profissionais', icon: Users, label: 'Profissionais' },
  { to: '/admin/servicos', icon: Stethoscope, label: 'Serviços' },
  { to: '/admin/recrutamento', icon: Users, label: 'Recrutamento' },
  { to: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
  { section: 'ANALYTICS' },
  { to: '/admin/metricas/profissionais', icon: BarChart3, label: 'Métr. Profissionais' },
  { to: '/admin/metricas/servicos', icon: TrendingUp, label: 'Métr. Serviços' },
  { to: '/admin/faturamento', icon: DollarSign, label: 'Faturamento' },
  { to: '/admin/marketing', icon: Megaphone, label: 'Marketing' },
  { to: '/admin/movimento', icon: Activity, label: 'Movimento' },
]

const routeLabels: Record<string, string> = {
  '/recepcao': 'Visão Geral',
  '/recepcao/agenda': 'Agenda',
  '/recepcao/mensagens': 'Mensagens',
  '/recepcao/pacientes': 'Pacientes',
  '/recepcao/profissionais': 'Profissionais',
  '/recepcao/servicos': 'Serviços',
  '/admin': 'Visão Geral',
  '/admin/profissionais': 'Profissionais',
  '/admin/servicos': 'Serviços',
  '/admin/configuracoes': 'Configurações',
  '/admin/metricas/profissionais': 'Métricas de Profissionais',
  '/admin/metricas/servicos': 'Métricas de Serviços',
  '/admin/faturamento': 'Faturamento',
  '/admin/marketing': 'Marketing',
  '/admin/movimento': 'Movimento',
  '/admin/recrutamento': 'Recrutamento',
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTIONIST: 'Recepcionista',
  PROFESSIONAL: 'Profissional',
  PATIENT: 'Paciente',
}

export default function InternalLayout({ environment }: InternalLayoutProps) {
  const links = environment === 'reception' ? receptionLinks : adminLinks
  const { user, signOut } = useAuth()
  const { data: clinic } = useMyClinic()
  const navigate = useNavigate()
  const location = useLocation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null)

  // Dynamic topbar data
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const { data: conversations = [] } = useConversations()
  const { data: todayAppts = [] } = useAppointments(
    todayStart.toISOString(),
    todayEnd.toISOString()
  )
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  const pendingAppts = todayAppts.filter(a => a.status === 'SCHEDULED').length

  const pageTitle = routeLabels[location.pathname] || (environment === 'reception' ? 'Recepção' : 'Administração')

  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  const userName = user?.name || 'Usuário'
  const userRole = user?.role ? roleLabels[user.role] : ''
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const alertsPath = environment === 'reception' ? '/recepcao/agenda' : '/admin/movimento'
  const messagesPath = environment === 'reception' ? '/recepcao/mensagens' : '/admin'

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.classList.remove('mobile-menu-open')
      return
    }

    document.body.classList.add('mobile-menu-open')

    const focusable = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    focusable?.[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        mobileMenuTriggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !focusable || focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('mobile-menu-open')
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  return (
    <div className="internal-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <ClinicLogoMini logoUrl={clinic?.logoUrl} />
          <span>{clinic?.name || 'Vitalis'}</span>
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
            const navItem = item as any
            const Icon = navItem.icon
            return (
              <NavLink
                key={navItem.to}
                to={navItem.to}
                end={navItem.end}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <Icon size={20} />
                <span>{navItem.label}</span>
                {navItem.to === '/recepcao/mensagens' && unreadMessages > 0 && (
                  <span className="badge-count">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-user">
          <div className="avatar avatar-sm avatar-placeholder">
            {userInitials}
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
          <div className="topbar-title-group">
            <h1 className="topbar-title">{pageTitle}</h1>
            <span className="topbar-date">{todayLabel}</span>
          </div>
          <div className="topbar-actions">
            <button
              ref={mobileMenuTriggerRef}
              className="topbar-icon-btn topbar-mobile-menu-btn"
              title="Abrir menu"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação"
              aria-expanded={mobileMenuOpen}
              aria-controls="internal-mobile-menu"
            >
              <Menu size={20} />
            </button>

            {/* Pending appointments bell */}
            <button className="topbar-icon-btn" title={`${pendingAppts} consulta(s) pendente(s) hoje`}
              onClick={() => navigate(alertsPath)}
              aria-label="Abrir alertas e agenda"
            >
              <Bell size={20} />
              {pendingAppts > 0 && (
                <span className="badge-count">{pendingAppts > 99 ? '99+' : pendingAppts}</span>
              )}
            </button>

            {/* Unread messages */}
            <button className="topbar-icon-btn" title={`${unreadMessages} mensagem(ns) não lida(s)`}
              onClick={() => navigate(messagesPath)}
              aria-label="Abrir mensagens e comunicações"
            >
              <MessageCircle size={20} />
              {unreadMessages > 0 && (
                <span className="badge-count">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
              )}
            </button>

            {/* User menu */}
            <div className="topbar-user-menu" ref={userMenuRef}>
              <button
                className="topbar-user-btn"
                onClick={() => setUserMenuOpen(o => !o)}
                aria-label="Menu do usuário"
              >
                <div className="avatar avatar-sm avatar-placeholder">{userInitials}</div>
                <ChevronDown size={14} className={`topbar-chevron${userMenuOpen ? ' open' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="topbar-user-dropdown">
                  <div className="topbar-dropdown-header">
                    <div className="avatar avatar-sm avatar-placeholder" style={{ flexShrink: 0 }}>{userInitials}</div>
                    <div>
                      <div className="topbar-dropdown-name">{userName}</div>
                      <div className="topbar-dropdown-role">
                        {environment === 'admin' && <Shield size={10} style={{ display: 'inline', marginRight: 3 }} />}
                        {userRole}
                      </div>
                    </div>
                  </div>
                  <div className="topbar-dropdown-divider" />
                  <button className="topbar-dropdown-item topbar-dropdown-item--danger" onClick={handleLogout}>
                    <LogOut size={15} /> Sair do sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="internal-mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        >
          <div
            id="internal-mobile-menu"
            ref={mobileMenuRef}
            className="internal-mobile-menu"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Menu de navegação ${environment === 'reception' ? 'da recepção' : 'do admin'}`}
          >
            <div className="internal-mobile-menu-header">
              <div className="sidebar-logo" style={{ borderBottom: 'none', padding: 0 }}>
                <ClinicLogoMini logoUrl={clinic?.logoUrl} />
                <span>{clinic?.name || 'Vitalis'}</span>
              </div>
              <button className="modal-close" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar navegação">
                <X size={20} />
              </button>
            </div>

            <div className="internal-mobile-menu-links">
              {links.map((item, i) => {
                if ('section' in item) {
                  return <div key={i} className="sidebar-section-title" style={{ color: 'var(--color-text-muted)' }}>{item.section}</div>
                }
                const navItem = item as any
                const Icon = navItem.icon
                return (
                  <NavLink
                    key={navItem.to}
                    to={navItem.to}
                    end={navItem.end}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{navItem.label}</span>
                    {navItem.to === '/recepcao/mensagens' && unreadMessages > 0 && (
                      <span className="badge-count">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom bar */}
      <div className="mobile-bottombar">
        {(environment === 'reception' ? receptionLinks : adminLinks.filter(l => 'to' in l).slice(0, 5)).map((item) => {
          const navItem = item as any
          if (navItem.section) return null
          const Icon = navItem.icon
          return (
            <NavLink
              key={navItem.to}
              to={navItem.to}
              end={navItem.end}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <Icon size={22} />
              <span>{navItem.label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
