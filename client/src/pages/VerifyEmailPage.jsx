import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyEmail } from '../api/auth';
import AuthShell from '../components/layout/AuthShell';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setErrMsg(err.response?.data?.error || 'Enlace inválido o ya utilizado');
        setStatus('error');
      });
  }, [token]);

  return (
    <AuthShell>
      <div className="vaq-card w-full max-w-sm p-8 text-center">
        {status === 'loading' && <p className="text-[var(--vaq-muted)]">Verificando...</p>}

        {status === 'success' && (
          <>
            <div className="mb-4 text-4xl">✅</div>
            <h1
              className="mb-2 text-2xl font-bold text-[var(--vaq-tone-success-text)]"
              style={{ fontFamily: 'var(--font-nav-display)' }}
            >
              ¡Cuenta verificada!
            </h1>
            <p className="mb-6 text-[var(--vaq-muted)]">Ya puedes iniciar sesión en VaquitaApp.</p>
            <Link to="/login" className="vaq-btn-primary inline-block rounded-lg px-6 py-2 text-sm">
              Iniciar sesión
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4 text-4xl">❌</div>
            <h1 className="mb-2 text-2xl font-bold text-[var(--vaq-danger)]">Enlace inválido</h1>
            <p className="text-sm text-[var(--vaq-muted)]">{errMsg}</p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
