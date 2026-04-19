import { useState } from 'react'
import { Search, Clock, Shield, Loader2 } from 'lucide-react'
import { useServices, useUpdateService } from '../../hooks/useServices'

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }
  return `${minutes} min`
}

function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export default function ServicosPage() {
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: services = [], isLoading } = useServices()
  const updateService = useUpdateService()

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggleOnline = async (id: string, current: boolean) => {
    setTogglingId(id)
    try {
      await updateService.mutateAsync({ id, onlineBooking: !current })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="services-ops-search">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            className="input-field"
            placeholder="Buscar serviço..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ padding: '48px 16px' }}>
          <p>Carregando serviços...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Nenhum serviço encontrado.
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="service-table-wrapper card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Duração</th>
                  <th>Sala / Categoria</th>
                  <th>Agend. Online</th>
                  <th>Preço</th>
                  <th>Convênios</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(svc => {
                  const insuranceCount = svc.insurances?.length || 0
                  const isToggling = togglingId === svc.id
                  return (
                    <tr key={svc.id}>
                      <td style={{ fontWeight: 500 }}>{svc.name}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
                          <Clock size={13} /> {formatDuration(svc.duration)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{svc.category || '—'}</td>
                      <td>
                        {isToggling ? (
                          <Loader2 size={16} className="animate-spin" color="var(--color-accent-emerald)" />
                        ) : (
                          <div className={`toggle${svc.onlineBooking ? ' active' : ''}`} style={{ cursor: 'pointer' }}
                            title={svc.onlineBooking ? 'Desativar agendamento online' : 'Ativar agendamento online'}
                            onClick={() => handleToggleOnline(svc.id, svc.onlineBooking)} />
                        )}
                      </td>
                      <td style={{ color: 'var(--color-accent-gold)', fontWeight: 500 }}>{formatPrice(svc.price)}</td>
                      <td><span className="badge badge-emerald"><Shield size={10} /> {insuranceCount}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="service-card-list card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.map(svc => {
              const insuranceCount = svc.insurances?.length || 0
              const isToggling = togglingId === svc.id
              return (
                <div key={svc.id} className="service-card-mobile">
                  <div className="service-card-row">
                    <span className="service-card-name">{svc.name}</span>
                    {isToggling ? (
                      <Loader2 size={16} className="animate-spin" color="var(--color-accent-emerald)" />
                    ) : (
                      <div className={`toggle${svc.onlineBooking ? ' active' : ''}`} style={{ cursor: 'pointer', flexShrink: 0 }}
                        title={svc.onlineBooking ? 'Desativar online' : 'Ativar online'}
                        onClick={() => handleToggleOnline(svc.id, svc.onlineBooking)} />
                    )}
                  </div>
                  <div className="service-card-meta">
                    <Clock size={12} />
                    <span>{formatDuration(svc.duration)}</span>
                    {svc.category && <><span>·</span><span>{svc.category}</span></>}
                  </div>
                  <div className="service-card-footer">
                    <span className="service-card-price">{formatPrice(svc.price)}</span>
                    <span className="badge badge-emerald"><Shield size={10} /> {insuranceCount} convênio{insuranceCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
