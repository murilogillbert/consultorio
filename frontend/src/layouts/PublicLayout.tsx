import { useState, useEffect } from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'
import { Menu, X, MessageCircle, Phone, ExternalLink } from 'lucide-react'

function ClinicLogo() {
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/servicos', label: 'Serviços' },
    { to: '/profissionais', label: 'Profissionais' },
    { to: '/sobre', label: 'Sobre' },
    { to: '/trabalhe-conosco', label: 'Trabalhe Conosco' },
  ]

  return (
    <div className="public-layout">
      {/* Navbar */}
      <nav className={`public-navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <Link to="/" className="navbar-logo">
            <ClinicLogo />
            <span>Clínica Vitalis</span>
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
          <Link
            to="/agendar"
            className="btn btn-primary btn-lg"
            onClick={() => setMobileOpen(false)}
          >
            Agendar Consulta
          </Link>
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
              <div className="footer-description">
                <ClinicLogo />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-accent-emerald)' }}>Clínica Vitalis</span>
              </div>
              <p>
                Cuidado médico de excelência há mais de 20 anos. Nossa missão é
                proporcionar saúde e bem-estar com atendimento humanizado e tecnologia de ponta.
              </p>
            </div>
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
              <a href="tel:+5511999999999">(11) 99999-9999</a>
              <a href="mailto:contato@clinicavitalis.com.br">contato@clinicavitalis.com.br</a>
              <p style={{ marginTop: '8px' }}>Rua da Saúde, 1234 — São Paulo, SP</p>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Política de Privacidade</a>
              <a href="#">Termos de Uso</a>
              <p style={{ marginTop: '8px', fontSize: '12px' }}>CNPJ: 12.345.678/0001-99</p>
              <p style={{ fontSize: '12px' }}>CRM: 123456</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Clínica Vitalis. Todos os direitos reservados.</p>
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
