import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import InternalLayout from './layouts/InternalLayout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/public/HomePage'
import ServicosPage from './pages/public/ServicosPage'
import ProfissionaisPage from './pages/public/ProfissionaisPage'
import SobrePage from './pages/public/SobrePage'
import TrabalheConoscoPage from './pages/public/TrabalheConoscoPage'
import AgendamentoPage from './pages/public/AgendamentoPage'
import MinhasConsultasPage from './pages/public/MinhasConsultasPage'
import RecDashboard from './pages/reception/DashboardPage'
import RecAgenda from './pages/reception/AgendaPage'
import RecMensagens from './pages/reception/MensagensPage'
import RecProfissionais from './pages/reception/ProfissionaisPage'
import RecServicos from './pages/reception/ServicosPage'
import RecPatients from './pages/reception/PatientsPage'
import AdminDashboard from './pages/admin/DashboardPage'
import AdminProfissionais from './pages/admin/ProfissionaisPage'
import AdminServicos from './pages/admin/ServicosPage'
import AdminConfiguracoes from './pages/admin/ConfiguracoesPage'
import AdminMetricasProfissionais from './pages/admin/MetricasProfissionaisPage'
import AdminMetricasServicos from './pages/admin/MetricasServicosPage'
import AdminFaturamento from './pages/admin/FaturamentoPage'
import AdminMarketing from './pages/admin/MarketingPage'
import AdminMovimento from './pages/admin/MovimentoPage'
import AdminRecrutamento from './pages/admin/RecrutamentoPage'
import LoginPage from './pages/auth/LoginPage'

export default function App() {
  return (
    <Routes>
      {/* Public Portal */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/servicos" element={<ServicosPage />} />
        <Route path="/profissionais" element={<ProfissionaisPage />} />
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/trabalhe-conosco" element={<TrabalheConoscoPage />} />
        <Route path="/agendar" element={<AgendamentoPage />} />
        <Route path="/minhas-consultas" element={<MinhasConsultasPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Reception */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'RECEPTIONIST']} />}>
        <Route element={<InternalLayout environment="reception" />}>
          <Route path="/recepcao" element={<RecDashboard />} />
          <Route path="/recepcao/agenda" element={<RecAgenda />} />
          <Route path="/recepcao/mensagens" element={<RecMensagens />} />
          <Route path="/recepcao/profissionais" element={<RecProfissionais />} />
          <Route path="/recepcao/servicos" element={<RecServicos />} />
          <Route path="/recepcao/pacientes" element={<RecPatients />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<InternalLayout environment="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/profissionais" element={<AdminProfissionais />} />
          <Route path="/admin/servicos" element={<AdminServicos />} />
          <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
          <Route path="/admin/metricas/profissionais" element={<AdminMetricasProfissionais />} />
          <Route path="/admin/metricas/servicos" element={<AdminMetricasServicos />} />
          <Route path="/admin/faturamento" element={<AdminFaturamento />} />
          <Route path="/admin/marketing" element={<AdminMarketing />} />
          <Route path="/admin/movimento" element={<AdminMovimento />} />
          <Route path="/admin/recrutamento" element={<AdminRecrutamento />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
