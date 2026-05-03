import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { confirmDeleteAccount } from '../api/participants';
import { useAuth } from '../contexts/AuthContext';
import AuthShell from '../components/layout/AuthShell';

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
  }, [token, logout]);

  return (
    <AuthShell>
      <div className="vaq-card w-full max-w-sm p-8 text-center">
        {step === 'loading' && (
          <>
            <div className="vaq-spinner mx-auto mb-4" aria-hidden />
            <p className="text-sm text-[var(--vaq-muted)]">Procesando…</p>
          </>
        )}
        {step === 'success' && (
          <>
            <div className="mb-4 text-4xl">👋</div>
            <h1 className="mb-2 text-lg font-bold text-[var(--vaq-ink)]">Cuenta eliminada</h1>
            <p className="mb-6 text-sm text-[var(--vaq-muted)]">
              Tu cuenta ha sido eliminada correctamente. Lamentamos verte partir.
            </p>
            <Link to="/login" className="vaq-link text-sm">
              Ir al inicio de sesión
            </Link>
          </>
        )}
        {step === 'error' && (
          <>
            <div className="mb-4 text-4xl">❌</div>
            <h1 className="mb-2 text-lg font-bold text-[var(--vaq-ink)]">Enlace inválido</h1>
            <p className="mb-6 text-sm text-[var(--vaq-muted)]">El enlace ya fue utilizado o no es válido.</p>
            <Link to="/perfil" className="vaq-link text-sm">
              Volver al perfil
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
