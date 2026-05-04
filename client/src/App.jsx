import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FundsPage from './pages/FundsPage';
import CreateFundPage from './pages/CreateFundPage';
import EditFundPage from './pages/EditFundPage';
import FundDetailPage from './pages/FundDetailPage';
import PublicDirectoryPage from './pages/PublicDirectoryPage';
import InvitationResponsePage from './pages/InvitationResponsePage';
import FundAccessResponsePage from './pages/FundAccessResponsePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';
import ConfirmDeletePage from './pages/ConfirmDeletePage';
import JoinRequestResponsePage from './pages/JoinRequestResponsePage';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--vaq-bg-page)] text-[var(--vaq-ink)]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function Protected({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          <Route path="/login"             element={<LoginPage />} />
          <Route path="/register"          element={<RegisterPage />} />
          <Route path="/fondos"            element={<Protected><FundsPage /></Protected>} />
          <Route path="/fondos/crear"      element={<Protected><CreateFundPage /></Protected>} />
          <Route path="/fondos/:id"        element={<Protected><FundDetailPage /></Protected>} />
          <Route path="/fondos/:id/editar" element={<Protected><EditFundPage /></Protected>} />
          <Route path="/directorio"        element={<Protected><PublicDirectoryPage /></Protected>} />
          <Route path="/perfil"                element={<Protected><ProfilePage /></Protected>} />
          <Route path="/invitaciones/:token"     element={<InvitationResponsePage />} />
          <Route path="/solicitudes-acceso/:token" element={<FundAccessResponsePage />} />
          <Route path="/verificar-email/:token"      element={<VerifyEmailPage />} />
          <Route path="/confirmar-eliminacion/:token" element={<ConfirmDeletePage />} />
          <Route path="/solicitudes-union/:token"    element={<JoinRequestResponsePage />} />
          <Route path="*"                  element={<Navigate to="/fondos" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
