import { useState } from 'react'
import { Search, Clock, Shield } from 'lucide-react'
import { useServices } from '../../hooks/useServices'

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
  const [onlineToggle, setOnlineToggle] = useState<Record<number, boolean>>({})
  const { data: services = [], isLoading } = useServices()

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="animate-fade-in">
      <div className="services-ops-search">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input className="input-field" placeholder="Buscar serviço..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ padding: '48px 16px' }}>
          <p>Carregando serviços...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Duração</th>
                <th>Sala / Equipamento</th>
                <th>Agend. Online</th>
                <th>Preço</th>
                <th>Convênios</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((svc, i) => {
                const isOnline = onlineToggle[i] !== undefined ? onlineToggle[i] : svc.onlineBooking
                const insuranceCount = svc.insurances?.length || 0
                return (
                  <tr key={svc.id} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{svc.name}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
                        <Clock size={13} /> {formatDuration(svc.duration)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{svc.category || '—'}</td>
                    <td>
                      <div
                        className={`toggle${isOnline ? ' active' : ''}`}
                        onClick={() => setOnlineToggle({ ...onlineToggle, [i]: !isOnline })}
                      />
                    </td>
                    <td style={{ color: 'var(--color-accent-gold)', fontWeight: 500 }}>{formatPrice(svc.price)}</td>
                    <td>
                      <span className="badge badge-emerald">
                        <Shield size={10} /> {insuranceCount}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
