import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { acceptJoinRequest, rejectJoinRequest } from '../api/participants';
import AuthShell from '../components/layout/AuthShell';

export default function JoinRequestResponsePage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  const invalidAction = action !== 'accept' && action !== 'reject';
  const [status, setStatus] = useState(() => (invalidAction ? 'error' : 'loading'));
  const [fund, setFund] = useState(null);
  const [error, setError] = useState(() => (invalidAction ? 'Acción no válida' : ''));

  useEffect(() => {
    if (invalidAction) return;
    const fn = action === 'accept' ? acceptJoinRequest : rejectJoinRequest;
    fn(token)
      .then((res) => {
        setFund(res.data.fund);
        setStatus(action);
      })
      .catch((err) => {
        setError(err.response?.data?.error ?? 'Error al procesar la solicitud');
        setStatus('error');
      });
  }, [token, action, invalidAction]);

  return (
    <AuthShell>
      <div className="vaq-card w-full max-w-md p-8 text-center">
        {status === 'loading' && <p className="text-sm text-[var(--vaq-muted)]">Procesando solicitud…</p>}

        {status === 'accept' && fund && (
          <>
            <div className="mb-3 text-4xl">✅</div>
            <h1 className="mb-2 text-xl font-bold text-[var(--vaq-ink)]">Solicitud aceptada</h1>
            <p className="text-sm text-[var(--vaq-muted)]">
              El usuario ya es participante del fondo <strong className="text-[var(--vaq-ink)]">{fund.name}</strong>.<br />
              Se le ha notificado por correo.
            </p>
            <Link to="/fondos" className="vaq-link mt-5 inline-block text-sm">
              Ir a mis fondos →
            </Link>
          </>
        )}

        {status === 'reject' && (
          <>
            <div className="mb-3 text-4xl">👋</div>
            <h1 className="mb-2 text-xl font-bold text-[var(--vaq-ink)]">Solicitud cancelada</h1>
            <p className="text-sm text-[var(--vaq-muted)]">Has cancelado la solicitud de acceso al fondo {fund?.name}.</p>
            <Link to="/fondos" className="vaq-link mt-5 inline-block text-sm">
              Ir a mis fondos →
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-3 text-4xl">⚠️</div>
            <h1 className="mb-2 text-xl font-bold text-[var(--vaq-ink)]">No se pudo procesar</h1>
            <p className="text-sm text-[var(--vaq-danger)]">{error}</p>
            <Link to="/fondos" className="vaq-link mt-5 inline-block text-sm">
              Volver a mis fondos
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
