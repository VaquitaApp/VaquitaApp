import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { confirmDeleteAccount } from '../api/participants';
import { useAuth } from '../contexts/AuthContext';

export default function ConfirmDeletePage() {
  const { token } = useParams();
  const { logout } = useAuth();
  const [step, setStep] = useState('loading');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    confirmDeleteAccount(token)
      .then(() => {
        logout();
        setStep('success');
      })
      .catch(() => setStep('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
        {step === 'loading' && (
          <>
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Procesando…</p>
          </>
        )}
        {step === 'success' && (
          <>
            <div className="text-4xl mb-4">👋</div>
            <h1 className="text-lg font-bold text-gray-800 mb-2">Cuenta eliminada</h1>
            <p className="text-sm text-gray-500 mb-6">Tu cuenta ha sido eliminada correctamente. Lamentamos verte partir.</p>
            <Link to="/login" className="text-sm text-indigo-600 hover:underline">Ir al inicio de sesión</Link>
          </>
        )}
        {step === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-lg font-bold text-gray-800 mb-2">Enlace inválido</h1>
            <p className="text-sm text-gray-500 mb-6">El enlace ya fue utilizado o no es válido.</p>
            <Link to="/perfil" className="text-sm text-indigo-600 hover:underline">Volver al perfil</Link>
          </>
        )}
      </div>
    </div>
  );
}
