import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { acceptJoinRequest, rejectJoinRequest } from '../api/participants';

export default function JoinRequestResponsePage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  const [status, setStatus] = useState('loading');
  const [fund, setFund] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (action !== 'accept' && action !== 'reject') {
      setStatus('error');
      setError('Acción no válida');
      return;
    }
    const fn = action === 'accept' ? acceptJoinRequest : rejectJoinRequest;
    fn(token)
      .then(res => {
        setFund(res.data.fund);
        setStatus(action);
      })
      .catch(err => {
        setError(err.response?.data?.error ?? 'Error al procesar la solicitud');
        setStatus('error');
      });
  }, [token, action]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <p className="text-gray-500 text-sm">Procesando solicitud…</p>
        )}

        {status === 'accept' && fund && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Solicitud aceptada</h1>
            <p className="text-sm text-gray-500">
              El usuario ya es participante del fondo <strong>{fund.name}</strong>.<br />
              Se le ha notificado por correo.
            </p>
            <Link to="/fondos" className="mt-5 inline-block text-indigo-600 hover:underline text-sm">
              Ir a mis fondos →
            </Link>
          </>
        )}

        {status === 'reject' && (
          <>
            <div className="text-4xl mb-3">👋</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Solicitud cancelada</h1>
            <p className="text-sm text-gray-500">
              Has cancelado la solicitud de acceso al fondo {fund?.name}.
            </p>
            <Link to="/fondos" className="mt-5 inline-block text-indigo-600 hover:underline text-sm">
              Ir a mis fondos →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">No se pudo procesar</h1>
            <p className="text-sm text-red-500">{error}</p>
          </>
        )}
      </div>
    </div>
  );
}
