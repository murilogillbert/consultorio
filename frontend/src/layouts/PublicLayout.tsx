import { useState, useEffect } from 'react'
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, MessageCircle, Phone, ExternalLink, LogIn, LogOut, CheckCircle, User } from 'lucide-react'
import { useClinics } from '../hooks/useClinics'
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
  const { data: clinics } = useClinics()
  const { user, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()
  const clinic = clinics?.[0]
  const clinicName = clinic?.name || 'Clínica Vitalis'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = () => {
    signOut()
    navigate('/')
    setMobileOpen(false)
  }

  // Rótulo amigável para o papel do usuário
  const roleLabel: Record<string, string> = {
    PATIENT: 'Paciente',
    PROFESSIONAL: 'Profissional',
    ADMIN: 'Admin',
    RECEPTIONIST: 'Recepcionista',
  }

  // Links que dependem do estado de autenticação do paciente
  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/servicos', label: 'Serviços' },
    { to: '/profissionais', label: 'Equipe Médica' },
    // "Minhas Consultas" só aparece para visitantes ou pacientes
    ...((!isAuthenticated || user?.role === 'PATIENT')
      ? [{ to: '/minhas-consultas', label: 'Minhas Consultas' }]
      : []),
    { to: '/sobre', label: 'Sobre' },
    { to: '/trabalhe-conosco', label: 'Trabalhe Conosco' },
  ]

  return (
    <div className="public-layout">
      {/* Navbar */}
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

          {/* Área de autenticação no header */}
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
                {/* Link para o portal do profissional */}
                {user.role === 'PROFESSIONAL' && (
                  <Link to="/profissional" className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '4px 10px' }}>
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

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mobile-menu-overlay">
          <button
            className="modal-close mobile-menu-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={28} />
          </button>

          {/* Info do usuário no mobile */}
          {isAuthenticated && user && (
            <div className="mobile-user-info">
              <div className="mobile-user-avatar">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.name} />
                  : <User size={20} />
                }
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={11} style={{ color: 'var(--color-brand)' }} />
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

          {/* Portal do profissional no mobile */}
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

          {/* Login / Sair no mobile */}
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

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>Links Rápidos</h4>
              <Link to="/servicos">Nossos Serviços</Link>
              <Link to="/profissionais">Equipe Médica</Link>
              <Link to="/sobre">Sobre Nós</Link>
              <Link to="/trabalhe-conosco">Trabalhe Conosco</Link>
              <Link to="/agendar">Agendar Consulta</Link>
            </div>
            <div className="footer-col">
              <h4>Contato</h4>
              <a href={`tel:${clinic?.phone || '+5511999999999'}`}>{clinic?.phone || '(11) 99999-9999'}</a>
              <a href={`mailto:${clinic?.email || 'contato@clinicavitalis.com.br'}`}>{clinic?.email || 'contato@clinicavitalis.com.br'}</a>
              <p style={{ marginTop: '8px' }}>{clinic?.address || 'Rua da Saúde, 1234 — São Paulo, SP'}</p>
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

      {/* Floating Contact */}
      <div className="floating-contact">
        {floatingOpen && (
          <div className="floating-menu">
            <button className="floating-menu-item" onClick={() => window.open('https://wa.me/5511999999999?text=Olá, gostaria de agendar uma consulta', '_blank')}>
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </button>
            <button className="floating-menu-item" onClick={() => window.open('tel:+5511999999999')}>
              <Phone size={18} />
              <span>Ligar</span>
            </button>
            <button className="floating-menu-item">
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
