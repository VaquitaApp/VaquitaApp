import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/ui/PasswordInput';

function formatRut(value) {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length <= 1) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

function validateRut(rut) {
  const clean = rut.replace(/\./g, '').replace(/-/, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul < 7 ? mul + 1 : 2;
  }
  const rem = 11 - (sum % 11);
  const computed = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem);
  return dv === computed;
}

function validateName(name) {
  const normalized = name.trim();
  return /^[\p{L} ]+$/u.test(normalized);
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm]     = useState({ name: '', email: '', password: '', rut: '', userType: 'persona_natural' });
  const [rutError, setRutError] = useState('');
  const [nameError, setNameError] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);

  const set = (field) => (e) => {
    const value = field === 'name'
      ? e.target.value.replace(/[^\p{L} ]/gu, '')
      : e.target.value;

    setForm(f => ({ ...f, [field]: value }));

    if (field === 'name') setNameError('');
  };

  function handleRutChange(e) {
    const formatted = formatRut(e.target.value);
    setForm(f => ({ ...f, rut: formatted }));
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
    if (!validateRut(form.rut)) { setRutError('RUT inválido'); return; }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-indigo-600 mb-2">Revisa tu correo</h1>
          <p className="text-gray-600 text-sm mb-1">
            Enviamos un enlace de verificación a
          </p>
          <p className="font-medium text-gray-800 mb-4">{form.email}</p>
          <p className="text-gray-500 text-xs mb-6">
            Haz clic en el enlace para activar tu cuenta. Si usas Mailpit en desarrollo, encuéntralo en{' '}
            <a href="http://localhost:8025" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
              localhost:8025
            </a>.
          </p>
          <Link to="/login" className="text-sm text-indigo-600 hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-indigo-600 text-center mb-1">VaquitaApp</h1>
        <p className="text-center text-gray-400 text-sm mb-6">Crea tu cuenta</p>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text" required value={form.name} onChange={set('name')}
              onBlur={handleNameBlur}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
            <input
              type="text" required placeholder="12.345.678-9"
              value={form.rut} onChange={handleRutChange} onBlur={handleRutBlur}
              maxLength={12}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${rutError ? 'border-red-400' : 'border-gray-200'}`}
            />
            {rutError && <p className="text-xs text-red-500 mt-1">{rutError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required value={form.email} onChange={set('email')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <PasswordInput
              required minLength={6} value={form.password} onChange={set('password')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
            <select
              value={form.userType} onChange={set('userType')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="persona_natural">Persona natural</option>
              <option value="organizacion">Organización</option>
            </select>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
