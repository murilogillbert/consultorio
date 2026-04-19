import { useEffect, useState } from 'react'
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, MessageCircle, Phone, ExternalLink, LogIn, LogOut, CheckCircle, User } from 'lucide-react'
import { usePublicClinic } from '../hooks/useClinics'
import { useAuth } from '../contexts/AuthContext'

function ClinicLogo({ logoUrl }: { logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }} />
  }

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#2D6A4F" />
      <path d="M20 8v24M8 20h24" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="20" r="14" stroke="#C9A84C" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export default function PublicLayout() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [floatingOpen, setFloatingOpen] = useState(false)
  const { data: clinic } = usePublicClinic()
  const { user, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()
  const clinicName = clinic?.name || 'Clínica'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.title = clinicName

    let favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }

    const faviconUrl = clinic?.logoUrl || '/favicon.svg'
    favicon.href = faviconUrl
    favicon.type = faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  }, [clinic?.logoUrl, clinicName])

  const handleSignOut = () => {
    signOut()
    navigate('/')
    setMobileOpen(false)
  }

  const roleLabel: Record<string, string> = {
    PATIENT: 'Paciente',
    PROFESSIONAL: 'Profissional',
    ADMIN: 'Admin',
    RECEPTIONIST: 'Recepcionista',
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/servicos', label: 'Serviços' },
    { to: '/profissionais', label: 'Equipe' },
    ...(!isAuthenticated || user?.role === 'PATIENT'
      ? [{ to: '/minhas-consultas', label: 'Minhas Consultas' }]
      : []),
    { to: '/sobre', label: 'Sobre' },
    { to: '/trabalhe-conosco', label: 'Trabalhe Conosco' },
  ]

  return (
    <div className="public-layout">
      <nav className={`public-navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <Link to="/" className="navbar-logo">
            <ClinicLogo logoUrl={clinic?.logoUrl} />
            <span>{clinicName}</span>
          </Link>

          <div className="navbar-links">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="navbar-auth">
            {isAuthenticated && user ? (
              <div className="navbar-user-chip">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="navbar-user-avatar-placeholder">
                    <User size={14} />
                  </div>
                )}
                <div className="navbar-user-info">
                  <span className="navbar-user-name">{user.name.split(' ')[0]}</span>
                  <span className="navbar-user-status">
                    <CheckCircle size={10} />
                    {roleLabel[user.role] ?? 'Logado'}
                  </span>
                </div>
                {user.role === 'PROFESSIONAL' && (
                  <Link to="/profissional" className="btn btn-ghost btn-sm navbar-portal-btn">
                    Meu Portal
                  </Link>
                )}
                <button
                  className="btn btn-ghost btn-sm navbar-signout"
                  onClick={handleSignOut}
                  title="Sair"
                  aria-label="Sair"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-outline btn-sm navbar-login-btn">
                <LogIn size={15} />
                Login / Cadastro
              </Link>
            )}
          </div>

          <Link to="/agendar" className="btn btn-primary navbar-cta">
            Agendar Consulta
          </Link>

          <button
            className="navbar-hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="mobile-menu-overlay">
          <button
            className="modal-close mobile-menu-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={28} />
          </button>

          {isAuthenticated && user && (
            <div className="mobile-user-info">
              <div className="mobile-user-avatar">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.name} />
                  : <User size={20} />
                }
              </div>
              <div>
                <div className="mobile-user-name">{user.name}</div>
                <div className="mobile-user-role">
                  <CheckCircle size={11} />
                  {roleLabel[user.role] ?? 'Logado'}
                </div>
              </div>
            </div>
          )}

          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}

          {isAuthenticated && user?.role === 'PROFESSIONAL' && (
            <Link
              to="/profissional"
              className="navbar-link"
              onClick={() => setMobileOpen(false)}
            >
              Meu Portal
            </Link>
          )}

          <Link
            to="/agendar"
            className="btn btn-primary btn-lg"
            onClick={() => setMobileOpen(false)}
          >
            Agendar Consulta
          </Link>

          {isAuthenticated ? (
            <button className="btn btn-outline btn-lg" onClick={handleSignOut}>
              <LogOut size={16} />
              Sair
            </button>
          ) : (
            <Link
              to="/login"
              className="btn btn-outline btn-lg"
              onClick={() => setMobileOpen(false)}
            >
              <LogIn size={16} />
              Login / Cadastro
            </Link>
          )}
        </div>
      )}

      <main>
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>Links Rápidos</h4>
              <Link to="/servicos">Nossos Serviços</Link>
              <Link to="/profissionais">Equipe</Link>
              <Link to="/sobre">Sobre Nós</Link>
              <Link to="/trabalhe-conosco">Trabalhe Conosco</Link>
              <Link to="/agendar">Agendar Consulta</Link>
            </div>
            <div className="footer-col">
              <h4>Contato</h4>
              <a href={`tel:${clinic?.phone || '+5511999999999'}`}>{clinic?.phone || '(11) 99999-9999'}</a>
              <a href={`mailto:${clinic?.email || 'contato@clinicavitalis.com.br'}`}>{clinic?.email || 'contato@clinicavitalis.com.br'}</a>
              <p style={{ marginTop: '8px' }}>{clinic?.address || 'Rua principal, 123 - Centro'}</p>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Política de Privacidade</a>
              <a href="#">Termos de Uso</a>
              <p style={{ marginTop: '8px', fontSize: '12px' }}>CNPJ: {clinic?.cnpj || '12.345.678/0001-99'}</p>
              <p style={{ fontSize: '12px' }}>Site oficial da sua clínica.</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} {clinicName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      <div className="floating-contact">
        {floatingOpen && (
          <div className="floating-menu">
            <button className="floating-menu-item" onClick={() => window.open(`https://wa.me/${(clinic?.whatsapp || clinic?.phone || '').replace(/\D/g, '')}?text=Olá, gostaria de agendar uma consulta`, '_blank')}>
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </button>
            <button className="floating-menu-item" onClick={() => window.open(`tel:${(clinic?.phone || clinic?.whatsapp || '').replace(/\D/g, '')}`)}>
              <Phone size={18} />
              <span>Ligar</span>
            </button>
            <button
              className="floating-menu-item"
              onClick={() => {
                setFloatingOpen(false)
                navigate(isAuthenticated ? '/minhas-consultas?tab=chat' : '/minhas-consultas')
              }}
            >
              <ExternalLink size={18} />
              <span>Chat Online</span>
            </button>
          </div>
        )}
        <button
          className="floating-btn"
          onClick={() => setFloatingOpen(!floatingOpen)}
          aria-label="Fale Conosco"
        >
          {floatingOpen ? <X size={24} /> : <MessageCircle size={24} />}
          <span className="floating-label">Fale Conosco</span>
        </button>
      </div>
    </div>
  )
}
