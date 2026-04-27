import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyEmail } from '../api/auth';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus]   = useState('loading');
  const [errMsg, setErrMsg]   = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(err => {
        setErrMsg(err.response?.data?.error || 'Enlace inválido o ya utilizado');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
        {status === 'loading' && (
          <p className="text-gray-500">Verificando...</p>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">¡Cuenta verificada!</h1>
            <p className="text-gray-600 mb-6">Ya puedes iniciar sesión en VaquitaApp.</p>
            <Link
              to="/login"
              className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Iniciar sesión
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-500 mb-2">Enlace inválido</h1>
            <p className="text-gray-600 text-sm">{errMsg}</p>
          </>
        )}
      </div>
    </div>
  );
}
