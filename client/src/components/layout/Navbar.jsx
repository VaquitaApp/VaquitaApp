import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fmtName } from '../../utils/format';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
      <Link to="/fondos" className="text-indigo-600 font-bold text-lg tracking-tight">
        VaquitaApp
      </Link>
      <div className="flex items-center gap-5 text-sm">
        <Link to="/fondos" className="text-gray-500 hover:text-gray-800 transition-colors">
          Mis fondos
        </Link>
        <Link to="/directorio" className="text-gray-500 hover:text-gray-800 transition-colors">
          Directorio público
        </Link>
        <Link to="/perfil" className="text-gray-500 hover:text-gray-800 transition-colors">{fmtName(user?.name)}</Link>
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-500 transition-colors"
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
