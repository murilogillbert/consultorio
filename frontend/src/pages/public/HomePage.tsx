import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Clock, MapPin, Phone,
  MessageCircle, Globe, Video, Share2,
  Heart, Activity, Stethoscope, Brain, Eye, Bone, Baby,
  CalendarDays, MessageSquare, ShieldCheck,
} from 'lucide-react'
import { useServices } from '../../hooks/useServices'
import { useProfessionals } from '../../hooks/useProfessionals'
import { usePublicClinic } from '../../hooks/useClinics'
import { useBanners } from '../../hooks/useBanners'

const serviceIcons = [Stethoscope, Heart, Brain, Eye, Bone, Baby]

function normalizeCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    Avaliacoes: 'Avaliações',
    Avaliacao: 'Avaliação',
  }
  return map[category] || category
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }
  return `${minutes} min`
}

function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function hasDisplayPrice(cents: number, showPrice: boolean): boolean {
  return showPrice && cents > 0
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [activeCategory, setActiveCategory] = useState('Todos')
  const { data: clinic } = usePublicClinic()
  const { data: banners = [], isLoading: loadingBanners } = useBanners(clinic?.id)
  const { data: services = [], isLoading: loadingServices } = useServices()
  const { data: professionals = [], isLoading: loadingProfessionals } = useProfessionals()

  const categories = [
    'Todos',
    ...Array.from(new Set(services.map(s => s.category).filter(Boolean) as string[])),
  ]

  const mockupPrimaryService = services[0]?.name || 'Atendimento principal'
  const mockupSecondaryService = services[1]?.name || 'Acompanhamento agendado'

  const nextSlide = useCallback(() => {
    if (banners.length === 0) return
    setCurrentSlide(prev => (prev + 1) % banners.length)
  }, [banners.length])

  const prevSlide = () => {
    if (banners.length === 0) return
    setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length)
  }

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(nextSlide, 5000)
      return () => clearInterval(interval)
    }
  }, [nextSlide, banners.length])

  const filteredServices = activeCategory === 'Todos'
    ? services
    : services.filter(s => s.category === activeCategory)

  const mapQuery = clinic?.address?.trim()
  const mapEmbedUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`
    : null

  const displayBanners = banners.length > 0 ? banners : [
    {
      id: 'default',
      title: 'Cuidado de Excelência',
      subtitle: 'Aqui, você encontra acolhimento, atenção aos detalhes e uma equipe pronta para cuidar de você.',
      ctaLabel: 'Agendar Consulta',
      ctaUrl: '/agendar',
      imageUrl: 'linear-gradient(135deg, #2D6A4F 0%, #1A1A1A 100%)',
    },
  ]

  return (
    <>
      <section className="hero-slider">
        {loadingBanners ? (
          <div className="hero-slide active">
            <div className="hero-slide-bg" style={{ background: 'var(--color-bg-secondary)' }} />
            <div className="hero-slide-content"><h1>Carregando...</h1></div>
          </div>
        ) : displayBanners.map((slide, i) => (
          <div key={slide.id} className={`hero-slide${i === currentSlide ? ' active' : ''}`}>
            <div
              className="hero-slide-bg"
              style={{
                background: slide.imageUrl?.startsWith('linear-gradient') ? slide.imageUrl : `url(${slide.imageUrl}) center/cover no-repeat`,
                backgroundColor: slide.imageUrl?.startsWith('http') ? 'transparent' : 'var(--color-primary-dark)',
              }}
            />
            <div className="hero-slide-overlay" />
            <div className="hero-slide-content">
              <h1>{slide.title}</h1>
              <p>{slide.subtitle}</p>
              {slide.ctaUrl && (
                <Link to={slide.ctaUrl} className="btn btn-primary btn-lg">
                  {slide.ctaLabel || 'Saiba Mais'}
                </Link>
              )}
            </div>
          </div>
        ))}
        {banners.length > 1 && (
          <>
            <button className="hero-arrow hero-arrow-left" onClick={prevSlide} aria-label="Anterior">
              <ChevronLeft size={20} />
            </button>
            <button className="hero-arrow hero-arrow-right" onClick={nextSlide} aria-label="Próximo">
              <ChevronRight size={20} />
            </button>
            <div className="hero-dots">
              {banners.map((_, i) => (
                <button
                  key={i}
                  className={`hero-dot${i === currentSlide ? ' active' : ''}`}
                  onClick={() => setCurrentSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Nossos Serviços</h2>
            <div className="pill-tabs">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`pill-tab${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {normalizeCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>
          <div className="services-carousel stagger-children">
            {loadingServices ? (
              <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-8) 0' }}>Carregando serviços...</p>
            ) : filteredServices.map((service, i) => {
              const Icon = serviceIcons[i % serviceIcons.length]
              return (
                <div key={service.id} className="service-card">
                  <div className="service-card-icon">
                    <Icon size={24} />
                  </div>
                  <h3>{service.name}</h3>
                  <div className="duration">
                    <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    {formatDuration(service.duration)}
                  </div>
                  {hasDisplayPrice(service.price, service.showPrice) && (
                    <div className="price">{formatPrice(service.price)}</div>
                  )}
                  {service.category && (
                    <span className="badge badge-gold" style={{ marginTop: 8 }}>
                      {normalizeCategoryLabel(service.category)}
                    </span>
                  )}
                  <Link to="/agendar" className="btn btn-primary btn-sm" style={{ marginTop: 'auto' }}>
                    Agendar
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Nossa Equipe</h2>
            <div className="pill-tabs">
              {['Todos', ...Array.from(new Set(professionals.map(p => p.specialty)))].map(spec => (
                <button key={spec} className="pill-tab">{spec}</button>
              ))}
            </div>
          </div>
          <div className="professionals-carousel stagger-children">
            {loadingProfessionals ? (
              <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-8) 0' }}>Carregando profissionais...</p>
            ) : professionals.map((prof) => {
              const name = prof.user?.name || 'Profissional'
              const initials = name.split(' ').filter((_, j, arr) => j === 0 || j === arr.length - 1).map(n => n[0]).join('')
              return (
                <div key={prof.id} className="professional-card">
                  <div className="avatar avatar-lg avatar-gold-ring avatar-placeholder">
                    {prof.user?.avatarUrl ? (
                      <img src={prof.user.avatarUrl} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : initials}
                  </div>
                  <h3>{name}</h3>
                  <span className="crm">{prof.councilType} {prof.crm}</span>
                  <div className="specialties" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                    <span className="badge badge-emerald">{prof.specialty}</span>
                  </div>
                  <div className="actions">
                    <Link to="/profissionais" className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                      Ver perfil
                    </Link>
                    <Link to="/agendar" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                      Agendar
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="patient-portal-cta-section">
        <div className="container">
          <div className="patient-portal-cta-grid">
            <div className="patient-portal-cta-text">
              <h2>Acesse suas consultas de qualquer lugar</h2>
              <p>
                Veja seus agendamentos, histórico de consultas e converse diretamente
                com nossa equipe, tudo em um só lugar, sem precisar ligar.
              </p>
              <div className="patient-portal-cta-features">
                <div className="patient-portal-cta-feature">
                  <CalendarDays size={20} />
                  <span>Próximas consultas e histórico</span>
                </div>
                <div className="patient-portal-cta-feature">
                  <MessageSquare size={20} />
                  <span>Chat direto com a recepção</span>
                </div>
                <div className="patient-portal-cta-feature">
                  <ShieldCheck size={20} />
                  <span>Acesso seguro via código no email</span>
                </div>
              </div>
              <Link to="/minhas-consultas" className="btn btn-primary btn-lg" style={{ marginTop: 8 }}>
                <CalendarDays size={18} /> Acessar Minhas Consultas
              </Link>
            </div>
            <div className="patient-portal-cta-mockup">
              <div className="patient-portal-mockup-card">
                <div className="mockup-header">
                  <div className="mockup-avatar">JM</div>
                  <div>
                    <div className="mockup-name">João Mendes</div>
                    <div className="mockup-email">joao@email.com</div>
                  </div>
                </div>
                <div className="mockup-appointment">
                  <span className="badge badge-emerald" style={{ fontSize: 11 }}>Confirmada</span>
                  <div className="mockup-appointment-name">{mockupPrimaryService}</div>
                  <div className="mockup-appointment-date">Seg, 14 Abr - 09:00</div>
                </div>
                <div className="mockup-appointment" style={{ opacity: 0.5 }}>
                  <span className="badge badge-gold" style={{ fontSize: 11 }}>Agendada</span>
                  <div className="mockup-appointment-name">{mockupSecondaryService}</div>
                  <div className="mockup-appointment-date">Sex, 18 Abr - 14:30</div>
                </div>
                <div className="mockup-chat-preview">
                  <MessageSquare size={12} />
                  <span>Recepção: Sua consulta foi confirmada!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="map-section">
            {mapEmbedUrl ? (
              <div className="map-placeholder">
                <iframe
                  title={`Mapa de ${clinic?.name || 'localização da clínica'}`}
                  src={mapEmbedUrl}
                  className="map-embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="map-placeholder">
                <div style={{ textAlign: 'center' }}>
                  <MapPin size={48} />
                  <p style={{ marginTop: 12 }}>Endereço da clínica não configurado</p>
                </div>
              </div>
            )}
            <div className="map-info">
              <h3>Nossa Localização</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
                {clinic?.address || 'Endereço ainda não informado.'}
              </p>
              <table className="hours-table">
                <tbody>
                  <tr><td>Segunda a Sexta</td><td>07:00 - 20:00</td></tr>
                  <tr><td>Sábado</td><td>08:00 - 14:00</td></tr>
                  <tr><td>Domingo</td><td>Fechado</td></tr>
                </tbody>
              </table>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic?.address || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <MapPin size={16} />
                Como Chegar
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section-dark">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-item">
              <Phone size={28} />
              <h4>Telefone</h4>
              <p>{clinic?.phone || '(11) 99999-9999'}</p>
              <a href={`tel:${clinic?.phone?.replace(/\D/g, '')}`} className="btn btn-secondary" style={{ borderColor: 'var(--color-accent-gold)', color: 'var(--color-accent-gold)' }}>
                Ligar Agora
              </a>
            </div>
            <div className="contact-item">
              <MessageCircle size={28} />
              <h4>WhatsApp</h4>
              <p>Atendimento rápido</p>
              <a
                href={`https://wa.me/${clinic?.whatsapp?.replace(/\D/g, '') || '5511999999999'}?text=Olá, gostaria de agendar uma consulta`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Enviar Mensagem
              </a>
            </div>
            <div className="contact-item">
              <Activity size={28} />
              <h4>Redes Sociais</h4>
              <p>Siga nossas novidades</p>
              <div className="social-icons">
                {clinic?.facebook && <a href={clinic.facebook} className="social-icon" title="Facebook"><Globe size={18} /></a>}
                {clinic?.youtube && <a href={clinic.youtube} className="social-icon" title="YouTube"><Video size={18} /></a>}
                {clinic?.linkedin && <a href={clinic.linkedin} className="social-icon" title="LinkedIn"><Share2 size={18} /></a>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
