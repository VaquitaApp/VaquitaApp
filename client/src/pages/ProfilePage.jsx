import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, requestDeleteAccount } from '../api/participants';
import { fmtName } from '../utils/format';

const BANKS = [
  'Banco de Chile', 'Banco Santander', 'BCI', 'Scotiabank Chile',
  'Banco Estado', 'BICE', 'Itaú Chile', 'Banco Security',
  'Banco Falabella', 'Banco Ripley', 'Banco Consorcio',
  'Banco Internacional', 'Banco BTG Pactual', 'HSBC Bank Chile',
];

const ACCOUNT_TYPES = [
  { value: 'corriente', label: 'Cuenta Corriente' },
  { value: 'vista', label: 'Cuenta Vista / RUT' },
  { value: 'ahorro', label: 'Cuenta de Ahorro' },
  { value: 'chequera_electronica', label: 'Chequera Electrónica' },
];

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
        {value || <span className="text-gray-300 italic">—</span>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();

  const [account, setAccount] = useState({
    bank: user?.preferredAccount?.bank ?? '',
    accountType: user?.preferredAccount?.accountType ?? 'corriente',
    accountNumber: user?.preferredAccount?.accountNumber ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [deleteStep, setDeleteStep] = useState('idle'); // idle | sent | error
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  function setA(key, val) {
    setAccount(a => ({ ...a, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await updateProfile({ preferredAccount: account });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestDelete() {
    if (!window.confirm('¿Seguro deseas eliminar tu cuenta?')) {
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await requestDeleteAccount();
      setDeleteStep('sent');
    } catch (err) {
      setDeleteError(err.response?.data?.error ?? 'Error al solicitar eliminación');
      setDeleteStep('error');
    } finally {
      setDeleting(false);
    }
  }

  const rutFormatted = user?.rut
    ? user.rut.replace(/^(\d+)([0-9K])$/, (_, body, dv) =>
      body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv)
    : '';

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Mi perfil</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Información de cuenta</p>
        <ReadOnlyField label="Nombre" value={fmtName(user?.name)} />
        <ReadOnlyField label="RUT" value={rutFormatted} />
        <ReadOnlyField label="Correo" value={user?.email} />
      </div>

      {/* Editable: bank account */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cuenta bancaria preferida</p>
        <p className="text-xs text-gray-400">Se autocompletará al realizar aportes.</p>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {saved && <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">Cambios guardados correctamente.</p>}

        <select
          value={account.bank}
          onChange={e => setA('bank', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Sin banco seleccionado</option>
          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={account.accountType}
          onChange={e => setA('accountType', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Número de cuenta (solo dígitos)"
          value={account.accountNumber}
          onChange={e => setA('accountNumber', e.target.value.replace(/\D/g, ''))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando…' : 'Guardar cuenta bancaria'}
        </button>
      </form>

      {/* Delete account */}
      <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 space-y-3">
        <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Zona de peligro</p>

        {deleteStep === 'sent' ? (
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            Revisa tu correo <span className="font-medium">{user?.email}</span>. Te enviamos un enlace para confirmar la eliminación.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Eliminar tu cuenta es permanente. Solo es posible si no eres organizador ni participante de ningún fondo.
            </p>
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
            <button
              type="button"
              onClick={handleRequestDelete}
              disabled={deleting}
              className="w-full bg-white border border-red-300 hover:border-red-500 text-red-600 text-sm font-medium py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Verificando…' : 'Eliminar mi cuenta'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
