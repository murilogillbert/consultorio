import { useMemo, useState } from 'react'
import { Plus, Edit, Trash2, X, AlertTriangle, Search, DollarSign, TrendingDown } from 'lucide-react'
import { useCustos, useCreateCusto, useUpdateCusto, useDeleteCusto, type Custo } from '../../hooks/useCustos'

const periods = ['Hoje', '7 dias', '30 dias', '3 meses', '12 meses']
const tipos = ['Fixo', 'Variável']
const recorrencias = ['Único', 'Mensal', 'Anual']
const statusList = ['Pago', 'Pendente', 'Previsto']

const categoriasSugeridas = [
  'Aluguel',
  'Energia',
  'Internet',
  'Sistema',
  'Marketing',
  'Material de escritório',
  'Impostos',
  'Honorários contábeis',
  'Salários',
  'Outros',
]

interface FormState {
  nome: string
  categoria: string
  categoriaCustom: string
  valor: string
  tipo: string
  recorrencia: string
  dataCompetencia: string
  dataVencimento: string
  status: string
  observacoes: string
}

const emptyForm: FormState = {
  nome: '',
  categoria: 'Aluguel',
  categoriaCustom: '',
  valor: '',
  tipo: 'Fixo',
  recorrencia: 'Mensal',
  dataCompetencia: new Date().toISOString().slice(0, 10),
  dataVencimento: '',
  status: 'Pendente',
  observacoes: '',
}

function fmt(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function statusBadge(status: string) {
  if (status === 'Pago') return 'badge badge-emerald'
  if (status === 'Pendente') return 'badge badge-gold'
  return 'badge badge-muted'
}

export default function CustosPage() {
  const [period, setPeriod] = useState('30 dias')
  const [search, setSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')

  const { data: custos = [], isLoading } = useCustos({ period })
  const createMutation = useCreateCusto()
  const updateMutation = useUpdateCusto()
  const deleteMutation = useDeleteCusto()

  const categoriasExistentes = useMemo(() => {
    const set = new Set<string>(categoriasSugeridas)
    custos.forEach(c => { if (c.categoria) set.add(c.categoria) })
    return Array.from(set).sort()
  }, [custos])

  const filtered = useMemo(() => {
    return custos.filter(c => {
      if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false
      if (categoriaFilter && c.categoria !== categoriaFilter) return false
      if (statusFilter && c.status !== statusFilter) return false
      return true
    })
  }, [custos, search, categoriaFilter, statusFilter])

  const total = filtered.reduce((sum, c) => sum + c.valor, 0)
  const pagos = filtered.filter(c => c.status === 'Pago').reduce((s, c) => s + c.valor, 0)
  const pendentes = filtered.filter(c => c.status === 'Pendente').reduce((s, c) => s + c.valor, 0)
  const previstos = filtered.filter(c => c.status === 'Previsto').reduce((s, c) => s + c.valor, 0)

  const byCategoria = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>()
    filtered.forEach(c => {
      const cat = c.categoria || 'Outros'
      const cur = map.get(cat) || { value: 0, count: 0 }
      map.set(cat, { value: cur.value + c.valor, count: cur.count + 1 })
    })
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value)
  }, [filtered])

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm, dataCompetencia: new Date().toISOString().slice(0, 10) })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(c: Custo) {
    setEditingId(c.id)
    const isCustom = !categoriasSugeridas.includes(c.categoria)
    setForm({
      nome: c.nome,
      categoria: isCustom ? '__custom__' : c.categoria,
      categoriaCustom: isCustom ? c.categoria : '',
      valor: c.valor.toString().replace('.', ','),
      tipo: c.tipo === 'Variavel' ? 'Variável' : c.tipo,
      recorrencia: c.recorrencia === 'Unico' ? 'Único' : c.recorrencia,
      dataCompetencia: c.dataCompetencia.slice(0, 10),
      dataVencimento: c.dataVencimento ? c.dataVencimento.slice(0, 10) : '',
      status: c.status,
      observacoes: c.observacoes || '',
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormError('')
  }

  async function handleSave() {
    setFormError('')
    if (!form.nome.trim()) { setFormError('Nome é obrigatório.'); return }
    const categoria = form.categoria === '__custom__' ? form.categoriaCustom.trim() : form.categoria
    if (!categoria) { setFormError('Categoria é obrigatória.'); return }
    const valorRaw = form.valor.replace(/[^\d,.-]/g, '').replace(',', '.')
    const valor = parseFloat(valorRaw)
    if (!Number.isFinite(valor) || valor < 0) { setFormError('Valor inválido.'); return }

    const payload = {
      nome: form.nome.trim(),
      categoria,
      valor,
      tipo: form.tipo,
      recorrencia: form.recorrencia,
      dataCompetencia: new Date(form.dataCompetencia).toISOString(),
      dataVencimento: form.dataVencimento ? new Date(form.dataVencimento).toISOString() : null,
      status: form.status,
      observacoes: form.observacoes || null,
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      closeForm()
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erro ao salvar custo.')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
      setDeleteName('')
    } catch {
      // mantém modal aberto se erro
    }
  }

  return (
    <div className="animate-fade-in admin-analytics-page">
      <div className="metrics-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Custos</h2>
        <div className="metrics-header-actions">
          <div className="date-presets">
            {periods.map(p => (
              <button key={p} className={`date-preset${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Novo Custo
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="metrics-row stagger-children">
        <div className="metric-card">
          <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} /> Total no período</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-danger)' }}>{fmt(total)}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{filtered.length} custo(s)</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Pagos</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-emerald)' }}>{fmt(pagos)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Pendentes</span>
          <span className="metric-value" style={{ color: 'var(--color-accent-gold)' }}>{fmt(pendentes)}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Previstos</span>
          <span className="metric-value">{fmt(previstos)}</span>
        </div>
      </div>

      {/* Análise por categoria */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-ui)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          <TrendingDown size={18} /> Custos por Categoria
        </h3>
        {byCategoria.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhum custo no período.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {byCategoria.map(c => {
            const max = Math.max(...byCategoria.map(b => b.value)) || 1
            const pct = (c.value / max) * 100
            const totalPct = total > 0 ? Math.round((c.value / total) * 100) : 0
            return (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{c.name} ({totalPct}%) · {c.count} item(s)</span>
                  <span style={{ fontWeight: 500 }}>{fmt(c.value)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-accent-danger)' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filtros */}
      <div className="crud-header" style={{ marginTop: 'var(--space-6)' }}>
        <div className="crud-filters">
          <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
            <Search size={16} />
            <input className="input-field" placeholder="Buscar custo..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-field" style={{ width: 'auto' }} value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)}>
            <option value="">Todas categorias</option>
            {categoriasExistentes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-field" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos status</option>
            {statusList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="card admin-table-card" style={{ marginTop: 'var(--space-4)', padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <p style={{ padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>Carregando custos...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Recorrência</th>
                <th>Competência</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Valor</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>Nenhum custo encontrado.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.nome}</td>
                  <td><span className="badge badge-gold">{c.categoria}</span></td>
                  <td>{c.tipo}</td>
                  <td>{c.recorrencia}</td>
                  <td>{new Date(c.dataCompetencia).toLocaleDateString('pt-BR')}</td>
                  <td>{c.dataVencimento ? new Date(c.dataVencimento).toLocaleDateString('pt-BR') : '—'}</td>
                  <td><span className={statusBadge(c.status)}>{c.status}</span></td>
                  <td style={{ color: 'var(--color-accent-danger)', fontWeight: 600 }}>{fmt(c.valor)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-icon btn-sm" title="Editar" onClick={() => openEdit(c)}>
                        <Edit size={14} color="var(--color-accent-emerald)" />
                      </button>
                      <button className="btn btn-icon btn-sm" title="Excluir" onClick={() => { setDeleteId(c.id); setDeleteName(c.nome) }}>
                        <Trash2 size={14} color="var(--color-accent-danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de criar/editar */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: 640, width: '92%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', margin: 0 }}>
                {editingId ? 'Editar Custo' : 'Novo Custo'}
              </h3>
              <button className="modal-close" onClick={closeForm}><X size={20} /></button>
            </div>

            <div className="form-2col">
              <div className="input-group full-span">
                <label className="input-label">Nome <span className="required">*</span></label>
                <input className="input-field" placeholder="Ex: Aluguel maio/2026" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
              </div>

              <div className="input-group">
                <label className="input-label">Categoria <span className="required">*</span></label>
                <select className="input-field" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {categoriasSugeridas.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__custom__">Outra (digitar)…</option>
                </select>
                {form.categoria === '__custom__' && (
                  <input className="input-field" placeholder="Nome da categoria" style={{ marginTop: 6 }} value={form.categoriaCustom} onChange={e => setForm({ ...form, categoriaCustom: e.target.value })} />
                )}
              </div>

              <div className="input-group">
                <label className="input-label">Valor (R$) <span className="required">*</span></label>
                <input className="input-field" placeholder="0,00" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
              </div>

              <div className="input-group">
                <label className="input-label">Tipo</label>
                <select className="input-field" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Recorrência</label>
                <select className="input-field" value={form.recorrencia} onChange={e => setForm({ ...form, recorrencia: e.target.value })}>
                  {recorrencias.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Data de Competência <span className="required">*</span></label>
                <input className="input-field" type="date" value={form.dataCompetencia} onChange={e => setForm({ ...form, dataCompetencia: e.target.value })} />
              </div>

              <div className="input-group">
                <label className="input-label">Data de Vencimento</label>
                <input className="input-field" type="date" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })} />
              </div>

              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {statusList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="input-group full-span">
                <label className="input-label">Observações</label>
                <textarea className="input-field" placeholder="Notas internas sobre este custo..." value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
              </div>
            </div>

            {formError && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', fontSize: 13, color: 'var(--color-accent-danger)', marginTop: 'var(--space-4)' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'var(--space-6)' }}>
              <button className="btn btn-secondary" onClick={closeForm}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exclusão */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: 420, width: '90%', padding: 'var(--space-8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-4)' }}>
              <AlertTriangle size={24} color="var(--color-accent-danger)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', margin: 0 }}>Excluir Custo</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 'var(--space-4)' }}>
              Excluir o custo <strong style={{ color: 'var(--color-text-primary)' }}>{deleteName}</strong>? Esta ação é permanente.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setDeleteId(null); setDeleteName('') }}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: 'var(--color-accent-danger)' }} onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
