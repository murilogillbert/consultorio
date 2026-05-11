import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import InternalLayout from './layouts/InternalLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ThemeProvider from './components/ThemeProvider'

const HomePage = lazy(() => import('./pages/public/HomePage'))
const ServicosPage = lazy(() => import('./pages/public/ServicosPage'))
const ProfissionaisPage = lazy(() => import('./pages/public/ProfissionaisPage'))
const SobrePage = lazy(() => import('./pages/public/SobrePage'))
const TrabalheConoscoPage = lazy(() => import('./pages/public/TrabalheConoscoPage'))
const PoliticaPrivacidadePage = lazy(() => import('./pages/public/PoliticaPrivacidadePage'))
const TermosUsoPage = lazy(() => import('./pages/public/TermosUsoPage'))
const AgendamentoPage = lazy(() => import('./pages/public/AgendamentoPage'))
const MinhasConsultasPage = lazy(() => import('./pages/public/MinhasConsultasPage'))
const ProfessionalDashboardPage = lazy(() => import('./pages/public/ProfessionalDashboardPage'))
const RecDashboard = lazy(() => import('./pages/reception/DashboardPage'))
const RecAgenda = lazy(() => import('./pages/reception/AgendaPage'))
const RecMensagens = lazy(() => import('./pages/reception/MensagensPage'))
const RecProfissionais = lazy(() => import('./pages/reception/ProfissionaisPage'))
const RecServicos = lazy(() => import('./pages/reception/ServicosPage'))
const RecPatients = lazy(() => import('./pages/reception/PatientsPage'))
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'))
const AdminProfissionais = lazy(() => import('./pages/admin/ProfissionaisPage'))
const AdminServicos = lazy(() => import('./pages/admin/ServicosPage'))
const AdminConfiguracoes = lazy(() => import('./pages/admin/ConfiguracoesPage'))
const AdminMetricasProfissionais = lazy(() => import('./pages/admin/MetricasProfissionaisPage'))
const AdminMetricasServicos = lazy(() => import('./pages/admin/MetricasServicosPage'))
const AdminFaturamento = lazy(() => import('./pages/admin/FaturamentoPage'))
const AdminCustos = lazy(() => import('./pages/admin/CustosPage'))
const AdminMarketing = lazy(() => import('./pages/admin/MarketingPage'))
const AdminMovimento = lazy(() => import('./pages/admin/MovimentoPage'))
const AdminRecrutamento = lazy(() => import('./pages/admin/RecrutamentoPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const ProfissionalDashboard = lazy(() => import('./pages/profissional/DashboardPage'))

export default function App() {
  return (
    <>
    <ThemeProvider />
    <Suspense fallback={<div style={{ padding: 32, textAlign: 'center' }}>Carregando...</div>}>
    <Routes>
      {/* Public Portal */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/servicos" element={<ServicosPage />} />
        <Route path="/profissionais" element={<ProfissionaisPage />} />
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/trabalhe-conosco" element={<TrabalheConoscoPage />} />
        <Route path="/legal/politica-de-privacidade" element={<PoliticaPrivacidadePage />} />
        <Route path="/legal/termos-de-uso" element={<TermosUsoPage />} />
        <Route path="/agendar" element={<AgendamentoPage />} />
        <Route path="/minhas-consultas" element={<MinhasConsultasPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/portal-profissional" element={<ProfessionalDashboardPage />} />

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
          <Route path="/admin/custos" element={<AdminCustos />} />
          <Route path="/admin/marketing" element={<AdminMarketing />} />
          <Route path="/admin/movimento" element={<AdminMovimento />} />
          <Route path="/admin/recrutamento" element={<AdminRecrutamento />} />
        </Route>
      </Route>

      {/* Portal do Profissional — renderizado dentro do PublicLayout para ter navbar */}
      <Route element={<ProtectedRoute allowedRoles={['PROFESSIONAL']} />}>
        <Route element={<PublicLayout />}>
          <Route path="/profissional" element={<ProfissionalDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  )
}
