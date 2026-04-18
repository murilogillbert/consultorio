import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock, ChevronDown, ChevronUp, Users, CreditCard,
  Stethoscope, Heart, Brain, Eye, Bone, Baby, Shield
} from 'lucide-react'
import { useServices } from '../../hooks/useServices'

const categoryIcons = [Stethoscope, Heart, Brain, Eye, Bone, Baby]

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

export default function ServicosPage() {
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const { data: services = [], isLoading } = useServices()

  const categories = [
    'Todos',
    ...Array.from(new Set(services.map(s => s.category).filter(Boolean) as string[])),
  ]

  const filtered = activeCategory === 'Todos'
    ? services
    : services.filter(s => s.category === activeCategory)

  return (
    <div style={{ marginTop: 'var(--navbar-height)', minHeight: '100vh' }}>
      <div className="container" style={{ padding: 'var(--space-12) var(--space-8)' }}>
        <h1 className="section-title" style={{ marginBottom: 'var(--space-6)' }}>Nossos Serviços</h1>

        <div className="pill-tabs" style={{ marginBottom: 'var(--space-8)' }}>
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

        {isLoading ? (
          <p style={{ color: 'var(--color-text-muted)', padding: 'var(--space-8) 0', textAlign: 'center' }}>Carregando serviços...</p>
        ) : (
        <div className="services-list stagger-children">
          {filtered.map((service, i) => {
            const Icon = categoryIcons[i % categoryIcons.length]
            const isExpanded = expandedIndex === i
            const professionalsForService = service.professionals || []
            return (
              <div key={service.id} className="service-list-card">
                <div className="service-list-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                    <div className="service-card-icon" style={{ flexShrink: 0 }}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3>{service.name}</h3>
                      <div className="service-list-meta">
                        <span><Clock size={14} /> {formatDuration(service.duration)}</span>
                        <span><CreditCard size={14} /> {formatPrice(service.price)}</span>
                        <span><Users size={14} /> {professionalsForService.length} profissionais</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {service.category && <span className="badge badge-gold">{normalizeCategoryLabel(service.category)}</span>}
                    <Link to="/agendar" className="btn btn-primary btn-sm">Agendar</Link>
                    <button
                      className="btn btn-icon btn-sm"
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      style={{ color: 'var(--color-accent-emerald)' }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--color-border-default)', marginTop: 16, paddingTop: 16 }}>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                      {service.description || service.shortDescription || 'Sem descrição disponível.'}
                    </p>

                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent-emerald)', marginBottom: 8 }}>
                          Preparo Necessário
                        </h4>
                        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{service.preparation || 'Nenhum preparo necessário'}</p>
                      </div>
                      {service.insurances && service.insurances.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent-emerald)', marginBottom: 8 }}>
                          Convênios Aceitos
                        </h4>
                        <div className="service-insurance-tags">
                          {service.insurances.map(ins => (
                            <span key={ins.insurancePlan.id} className="badge badge-emerald">
                              <Shield size={10} /> {ins.insurancePlan.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>

                    {professionalsForService.length > 0 && (
                    <div className="service-professionals-row" style={{ marginTop: 16 }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginRight: 8 }}>Profissionais:</span>
                      {professionalsForService.map((p) => {
                        const profName = p.professional.user?.name || ''
                        const profInitials = profName.split(' ').filter((_, j, arr) => j === 0 || j === arr.length - 1).map(n => n[0]).join('')
                        return (
                          <div key={p.professional.id} className="avatar avatar-sm avatar-placeholder" style={{ width: 28, height: 28, fontSize: 10 }}>{profInitials}</div>
                        )
                      })}
                    </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}
