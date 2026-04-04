import { useState } from 'react'
import { Search, Mail, Phone, Calendar, CheckCircle2, XCircle, Clock, ExternalLink, Briefcase, ChevronRight } from 'lucide-react'
import { useCandidacies, useUpdateCandidacyStatus } from '../../hooks/useHR'
import { useJobOpenings } from '../../hooks/useJobs'

const statusInfo: Record<string, { label: string, color: string, icon: any }> = {
  PENDING: { label: 'Pendente', color: 'badge-warning', icon: Clock },
  REVIEWED: { label: 'Em Revisão', color: 'badge-gold', icon: Search },
  INTERVIEWED: { label: 'Entrevistado', color: 'badge-info', icon: Calendar },
  HIRED: { label: 'Contratado', color: 'badge-emerald', icon: CheckCircle2 },
  REJECTED: { label: 'Rejeitado', color: 'badge-danger', icon: XCircle },
}

export default function RecrutamentoPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [jobFilter, setJobFilter] = useState('ALL')
  const [selectedCandidacyId, setSelectedCandidacyId] = useState<string | null>(null)

  const { data: candidacies = [], isLoading: loadingCandidacies } = useCandidacies()
  const { data: jobs = [] } = useJobOpenings()
  const updateStatus = useUpdateCandidacyStatus()

  const filteredCandidacies = candidacies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    const matchesJob = jobFilter === 'ALL' || c.jobOpeningId === jobFilter
    return matchesSearch && matchesStatus && matchesJob
  })

  const selectedCandidacy = candidacies.find(c => c.id === selectedCandidacyId)

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateStatus.mutateAsync({ id, status })
  }

  if (loadingCandidacies) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando candidaturas...</div>

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Recrutamento e Seleção</h1>
          <p className="admin-subtitle">Gerencie candidatos e processos seletivos da clínica</p>
        </div>
      </header>

      <div className="admin-content" style={{ display: 'grid', gridTemplateColumns: selectedCandidacyId ? '1fr 400px' : '1fr', gap: 'var(--space-6)', transition: 'all 0.3s ease' }}>
        <div className="card">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
              <Search size={18} />
              <input 
                placeholder="Buscar por nome ou email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="input-field" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">Todos os status</option>
              <option value="PENDING">Pendentes</option>
              <option value="REVIEWED">Em Revisão</option>
              <option value="INTERVIEWED">Entrevistados</option>
              <option value="HIRED">Contratados</option>
              <option value="REJECTED">Rejeitados</option>
            </select>
            <select className="input-field" style={{ width: 200 }} value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
              <option value="ALL">Todas as vagas</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              <option value="null">Banco de Talentos</option>
            </select>
          </div>

          {/* List */}
          <div className="data-list">
            {filteredCandidacies.map(c => {
                const status = statusInfo[c.status] || statusInfo.PENDING
                return (
                  <div 
                    key={c.id} 
                    className={`data-list-item clickable ${selectedCandidacyId === c.id ? 'active' : ''}`}
                    onClick={() => setSelectedCandidacyId(c.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: selectedCandidacyId === c.id ? 'var(--color-bg-secondary)' : 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="avatar-circle" style={{ width: 40, height: 40, background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', fontSize: 16 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Briefcase size={12} /> {c.jobOpening?.title || 'Banco de Talentos'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right' }}>
                        {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      <span className={`badge ${status.color}`} style={{ minWidth: 100, textAlign: 'center' }}>
                        {status.label}
                      </span>
                      <ChevronRight size={18} color="var(--color-text-muted)" />
                    </div>
                  </div>
                )
            })}
            {filteredCandidacies.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                    Nenhuma candidatura encontrada com os filtros selecionados.
                </div>
            )}
          </div>
        </div>

        {/* Details Sidebar */}
        {selectedCandidacyId && selectedCandidacy && (
          <div className="card animate-fade-in-right" style={{ position: 'sticky', top: 'var(--navbar-height)', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>Detalhes do Candidato</h3>
                <button className="btn btn-icon btn-sm" onClick={() => setSelectedCandidacyId(null)}><XCircle size={18} /></button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                <div className="avatar-circle" style={{ width: 64, height: 64, margin: '0 auto 12px', background: 'var(--color-primary-light)', fontSize: 24 }}>
                    {selectedCandidacy.name.charAt(0).toUpperCase()}
                </div>
                <h4 style={{ fontSize: 16 }}>{selectedCandidacy.name}</h4>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{selectedCandidacy.email}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                    <Mail size={16} color="var(--color-text-muted)" />
                    <span>{selectedCandidacy.email}</span>
                </div>
                {selectedCandidacy.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                        <Phone size={16} color="var(--color-text-muted)" />
                        <span>{selectedCandidacy.phone}</span>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                    <Briefcase size={16} color="var(--color-text-muted)" />
                    <span>Vaga: {selectedCandidacy.jobOpening?.title || 'Banco de Talentos'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                    <Calendar size={16} color="var(--color-text-muted)" />
                    <span>Aplicado em: {new Date(selectedCandidacy.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
            </div>

            {selectedCandidacy.message && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <h5 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Mensagem</h5>
                    <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
                        {selectedCandidacy.message}
                    </p>
                </div>
            )}

            {selectedCandidacy.resumeUrl && (
                <a 
                    href={selectedCandidacy.resumeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-full"
                    style={{ marginBottom: 'var(--space-8)' }}
                >
                    <ExternalLink size={16} /> Ver Currículo
                </a>
            )}

            <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-6)' }}>
                <h5 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Atualizar Status</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {Object.entries(statusInfo).map(([key, info]) => (
                        <button 
                            key={key}
                            className={`btn btn-sm ${selectedCandidacy.status === key ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => handleUpdateStatus(selectedCandidacy.id, key)}
                            disabled={updateStatus.isPending}
                        >
                            {info.label}
                        </button>
                    ))}
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
