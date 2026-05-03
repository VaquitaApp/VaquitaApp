import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/ui/PasswordInput';
import AuthShell from '../components/layout/AuthShell';

const inputClass =
  'w-full rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-2.5 text-sm text-[var(--vaq-ink)] shadow-sm transition-shadow placeholder:text-[var(--vaq-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/fondos');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-sm rounded-2xl border border-[var(--vaq-card-border)] bg-[var(--vaq-card)] p-8 shadow-lg shadow-[var(--vaq-forest)]/5 dark:shadow-black/40">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--vaq-badge-bg)] text-xl font-bold text-[var(--vaq-badge-fg)] shadow-md ring-2 ring-[var(--vaq-badge-bg)]/25">
            V
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight text-[var(--vaq-forest)]"
            style={{ fontFamily: 'var(--font-nav-display)' }}
          >
            VaquitaApp
          </h1>
          <p className="text-sm text-[var(--vaq-muted)]">Inicia sesión en tu cuenta</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-[var(--vaq-danger-soft)] px-3 py-2 text-center text-sm text-[var(--vaq-danger)]">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={form.email}
              onChange={set('email')}
              className={inputClass}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
              Contraseña
            </label>
            <PasswordInput
              id="login-password"
              required
              value={form.password}
              onChange={set('password')}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading || form.password.length < 6}
            className="w-full rounded-lg bg-[var(--vaq-badge-bg)] py-2.5 text-sm font-semibold text-[var(--vaq-badge-fg)] transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--vaq-muted)]">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-[var(--vaq-forest)] underline-offset-2 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
