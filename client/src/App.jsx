import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

function Protected({ children }) {
  return <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>;
}

export default function App() {
  return (
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
          <Route path="/invitaciones/:token" element={<InvitationResponsePage />} />
          <Route path="*"                  element={<Navigate to="/fondos" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
