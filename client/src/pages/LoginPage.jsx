import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/ui/PasswordInput';
import AuthShell from '../components/layout/AuthShell';
import { inputClass, authCardClass } from '../components/ui/formStyles';

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
      <div className={authCardClass}>
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img
            src="/logo.png"
            alt="Logo VaquitaApp"
            className="h-12 w-12 rounded-2xl object-contain shadow-md ring-2 ring-[var(--vaq-badge-bg)]/25 bg-[var(--vaq-bg-page)]"
          />
          <h1
            className="text-2xl font-semibold tracking-tight text-[var(--vaq-forest)]"
            style={{ fontFamily: 'var(--font-nav-display)' }}
          >
            VaquitaApp
          </h1>
          <p className="text-sm text-[var(--vaq-muted)]">Inicia sesión en tu cuenta</p>
        </div>

        {error && (
          <p data-testid="login-error" className="mb-4 rounded-lg bg-[var(--vaq-danger-soft)] px-3 py-2 text-center text-sm text-[var(--vaq-danger)]">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
              Email
            </label>
            <input
              id="login-email"
              data-testid="login-email"
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
              data-testid="login-password"
              required
              value={form.password}
              onChange={set('password')}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            data-testid="login-submit"
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
