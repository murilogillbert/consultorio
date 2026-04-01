import { useState } from 'react'
import { Search, Plus, Edit, Eye, Trash2, X } from 'lucide-react'
import { usePatients, useCreatePatient, useUpdatePatient } from '../../hooks/usePatients'
import { useSystemUsers } from '../../hooks/useUsers'

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: patients = [], isLoading } = usePatients(searchTerm)
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState<any | null>(null)
  
  // For new patients, they might need to be linked to a User
  // In a real scenario, we might create the User and Tenant/Patient profile together
  const { data: systemUsers = [] } = useSystemUsers()
  
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()

  const [formData, setFormData] = useState({
    userId: '',
    cpf: '',
    phone: '',
    birthDate: '',
    address: '',
    notes: ''
  })

  const handleEdit = (patient: any) => {
    setEditingPatient(patient)
    setFormData({
      userId: patient.userId,
      cpf: patient.cpf || '',
      phone: patient.phone || '',
      birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : '',
      address: patient.address || '',
      notes: patient.notes || ''
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPatient) {
        await updatePatient.mutateAsync({ id: editingPatient.id, ...formData })
      } else {
        await createPatient.mutateAsync(formData)
      }
      setShowModal(false)
      setEditingPatient(null)
      setFormData({ userId: '', cpf: '', phone: '', birthDate: '', address: '', notes: '' })
    } catch (err) {
      alert('Erro ao salvar paciente.')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="metrics-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title)' }}>Gestão de Pacientes</h2>
        <button className="btn btn-primary" onClick={() => { setEditingPatient(null); setShowModal(true) }}>
          <Plus size={18} /> Novo Paciente
        </button>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input 
            className="input-field" 
            style={{ paddingLeft: 40 }} 
            placeholder="Buscar por nome, CPF ou e-mail..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Carregando pacientes...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>CPF</th>
                <th>Contato</th>
                <th>Última Consulta</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                patients.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar avatar-sm avatar-placeholder">
                          {p.user?.name.split(' ').map((n: any) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{p.user?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.cpf || 'Não informado'}</td>
                    <td>
                      <div style={{ fontSize: 12 }}>{p.phone || 'N/A'}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {/* TODO: Fetch last appointment date if available */}
                      -
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-icon btn-sm" onClick={() => handleEdit(p)} title="Editar"><Edit size={14} /></button>
                        <button className="btn btn-icon btn-sm" title="Ver Prontuário"><Eye size={14} /></button>
                        <button className="btn btn-icon btn-sm" title="Remover"><Trash2 size={14} color="var(--color-accent-danger)" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-2col" style={{ marginBottom: 'var(--space-4)' }}>
                {!editingPatient && (
                  <div className="input-group full-span">
                    <label className="input-label">Vincular a Usuário Existente (Opcional)</label>
                    <select className="input-field" value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })}>
                      <option value="">Selecione um usuário...</option>
                      {systemUsers.map((su: any) => (
                        <option key={su.user.id} value={su.user.id}>{su.user.name} ({su.user.email})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="input-group">
                  <label className="input-label">CPF</label>
                  <input className="input-field" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
                <div className="input-group">
                  <label className="input-label">Telefone</label>
                  <input className="input-field" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
                <div className="input-group">
                  <label className="input-label">Data de Nascimento</label>
                  <input className="input-field" type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Endereço</label>
                  <input className="input-field" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Rua, Número, Bairro..." />
                </div>
                <div className="input-group full-span">
                  <label className="input-label">Observações Médicas / Notas</label>
                  <textarea className="input-field" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createPatient.isPending || updatePatient.isPending}>
                  {editingPatient ? 'Salvar Alterações' : 'Criar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-content {
          background: var(--color-bg-primary);
          padding: var(--space-6);
          border-radius: var(--radius-lg);
          width: 90%;
          border: 1px solid var(--color-border-subtle);
          box-shadow: var(--shadow-lg);
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: var(--space-6);
        }
        .modal-header h3 { font-family: var(--font-display); font-size: 20px; }
        .modal-header button { background: none; border: none; cursor: pointer; color: var(--color-text-muted); }
      `}</style>
    </div>
  )
}
