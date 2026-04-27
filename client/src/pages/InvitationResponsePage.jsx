import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { acceptInvitation, rejectInvitation } from '../api/participants';
import { fmtDateLong } from '../utils/format';

export default function InvitationResponsePage() {
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
    const fn = action === 'accept' ? acceptInvitation : rejectInvitation;
    fn(token)
      .then(res => {
        setFund(res.data.fund);
        setStatus(action);
      })
      .catch(err => {
        setError(err.response?.data?.error ?? 'Error al procesar la invitación');
        setStatus('error');
      });
  }, [token, action]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <p className="text-gray-500 text-sm">Procesando invitación…</p>
        )}

        {status === 'accept' && fund && (
          <>
            <div className="text-4xl mb-3">🎉</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Invitación aceptada</h1>
            <p className="text-sm text-gray-500">
              Ahora eres participante del fondo <strong>{fund.name}</strong>.<br />
              Fecha límite: {fmtDateLong(fund.deadline)}.
            </p>
            <Link to="/fondos" className="mt-5 inline-block text-indigo-600 hover:underline text-sm">
              Ir a mis fondos →
            </Link>
          </>
        )}

        {status === 'reject' && (
          <>
            <div className="text-4xl mb-3">👋</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Invitación rechazada</h1>
            <p className="text-sm text-gray-500">Has rechazado la invitación al fondo {fund?.name}.</p>
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
