import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/ui/PasswordInput';
import AuthShell from '../components/layout/AuthShell';
import { validateRut, validateName } from '../utils/validators';
import { inputClass, authCardClass } from '../components/ui/formStyles';

function formatRut(value) {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length <= 1) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    rut: '',
    userType: 'persona_natural',
  });
  const [rutError, setRutError] = useState('');
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (field) => (e) => {
    const value = field === 'name' ? e.target.value.replace(/[^\p{L} ]/gu, '') : e.target.value;

    setForm((f) => ({ ...f, [field]: value }));

    if (field === 'name') setNameError('');
  };

  function handleRutChange(e) {
    const formatted = formatRut(e.target.value);
    setForm((f) => ({ ...f, rut: formatted }));
    setRutError('');
  }

  function handleRutBlur() {
    if (form.rut && !validateRut(form.rut)) setRutError('RUT inválido');
  }

  function handleNameBlur() {
    if (form.name && !validateName(form.name)) {
      setNameError('El nombre solo puede contener letras y espacios');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateName(form.name)) {
      setNameError('El nombre solo puede contener letras y espacios');
      return;
    }
    if (!validateRut(form.rut)) {
      setRutError('RUT inválido');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(form);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <div className={`${authCardClass} text-center`}>
          <div className="mb-4 text-4xl" aria-hidden>
            📬
          </div>
          <h1
            className="mb-2 text-2xl font-semibold text-[var(--vaq-forest)]"
            style={{ fontFamily: 'var(--font-nav-display)' }}
          >
            Revisa tu correo
          </h1>
          <p className="mb-1 text-sm text-[var(--vaq-muted)]">Enviamos un enlace de verificación a</p>
          <p className="mb-4 font-medium text-[var(--vaq-ink)]">{form.email}</p>
          <p className="mb-6 text-xs text-[var(--vaq-muted)]">
            Haz clic en el enlace para activar tu cuenta.
          </p>
          <Link to="/login" className="text-sm font-semibold text-[var(--vaq-forest)] underline-offset-2 hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      </AuthShell>
    );
  }

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
          <p className="text-sm text-[var(--vaq-muted)]">Crea tu cuenta</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-[var(--vaq-danger-soft)] px-3 py-2 text-center text-sm text-[var(--vaq-danger)]">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
              Nombre
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              onBlur={handleNameBlur}
              className={inputClass}
            />
            {nameError && <p className="mt-1 text-xs text-[var(--vaq-danger)]">{nameError}</p>}
          </div>
          <div>
            <label htmlFor="reg-rut" className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
              RUT
            </label>
            <input
              id="reg-rut"
              type="text"
              required
              placeholder="12.345.678-9"
              value={form.rut}
              onChange={handleRutChange}
              onBlur={handleRutBlur}
              maxLength={12}
              className={`${inputClass} ${rutError ? 'border-[var(--vaq-danger)]' : ''}`}
            />
            {rutError && <p className="mt-1 text-xs text-[var(--vaq-danger)]">{rutError}</p>}
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={form.email}
              onChange={set('email')}
              className={inputClass}
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
              Contraseña
            </label>
            <PasswordInput
              id="reg-password"
              required
              minLength={6}
              value={form.password}
              onChange={set('password')}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="reg-type" className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
              Tipo de cuenta
            </label>
            <select
              id="reg-type"
              value={form.userType}
              onChange={set('userType')}
              className={inputClass}
            >
              <option value="persona_natural">Persona natural</option>
              <option value="organizacion">Organización</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--vaq-badge-bg)] py-2.5 text-sm font-semibold text-[var(--vaq-badge-fg)] transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--vaq-muted)]">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-[var(--vaq-forest)] underline-offset-2 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
