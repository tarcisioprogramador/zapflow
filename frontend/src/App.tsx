import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WhatsAppPage from './pages/WhatsAppPage';
import ConversationsPage from './pages/ConversationsPage';
import FlowsPage from './pages/FlowsPage';
import FlowEditorPage from './pages/FlowEditorPage';
import CrmPage from './pages/CrmPage';
import CampaignsPage from './pages/CampaignsPage';
import ContactsPage from './pages/ContactsPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="conversations/:id" element={<ConversationsPage />} />
        <Route path="flows" element={<FlowsPage />} />
        <Route path="flows/:id" element={<FlowEditorPage />} />
        <Route path="crm" element={<CrmPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/cancel" element={<PaymentCancelPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
