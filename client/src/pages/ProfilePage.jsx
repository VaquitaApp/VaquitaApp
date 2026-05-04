import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, requestDeleteAccount } from '../api/participants';
import { fmtName } from '../utils/format';

const BANKS = [
  'Banco de Chile',
  'Banco Santander',
  'BCI',
  'Scotiabank Chile',
  'Banco Estado',
  'BICE',
  'Itaú Chile',
  'Banco Security',
  'Banco Falabella',
  'Banco Ripley',
  'Banco Consorcio',
  'Banco Internacional',
  'Banco BTG Pactual',
  'HSBC Bank Chile',
];

const ACCOUNT_TYPES = [
  { value: 'corriente', label: 'Cuenta Corriente' },
  { value: 'vista', label: 'Cuenta Vista / RUT' },
  { value: 'ahorro', label: 'Cuenta de Ahorro' },
  { value: 'chequera_electronica', label: 'Chequera Electrónica' },
];

const fieldClass =
  'w-full rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-well-bg)] px-3 py-2 text-sm text-[var(--vaq-muted)]';

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">{label}</label>
      <div className={fieldClass}>
        {value || <span className="italic text-[var(--vaq-muted)]">—</span>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [account, setAccount] = useState({
    bank: user?.preferredAccount?.bank ?? '',
    accountType: user?.preferredAccount?.accountType ?? 'corriente',
    accountNumber: user?.preferredAccount?.accountNumber ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [deleteStep, setDeleteStep] = useState('idle');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  function setA(key, val) {
    setAccount((a) => ({ ...a, [key]: val }));
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
    ? user.rut.replace(/^(\d+)([0-9K])$/, (_, body, dv) => body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv)
    : '';

  const selectClass =
    'w-full rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-2 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-bold text-[var(--vaq-ink)]">Mi perfil</h1>
      <div className="vaq-card space-y-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--vaq-muted)]">Información de cuenta</p>
        <ReadOnlyField label="Nombre" value={fmtName(user?.name)} />
        <ReadOnlyField label="RUT" value={rutFormatted} />
        <ReadOnlyField label="Correo" value={user?.email} />
      </div>

      <form onSubmit={handleSubmit} className="vaq-card space-y-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--vaq-muted)]">Cuenta bancaria preferida</p>
        <p className="text-xs text-[var(--vaq-muted)]">Se autocompletará al realizar aportes.</p>

        {error && <p className="text-xs text-[var(--vaq-danger)]">{error}</p>}
        {saved && (
          <p className="rounded-lg border border-[var(--vaq-card-border)] bg-[var(--vaq-tone-success-bg)] px-3 py-2 text-xs text-[var(--vaq-tone-success-text)]">
            Cambios guardados correctamente.
          </p>
        )}

        <select value={account.bank} onChange={(e) => setA('bank', e.target.value)} className={selectClass}>
          <option value="">Sin banco seleccionado</option>
          {BANKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={account.accountType} onChange={(e) => setA('accountType', e.target.value)} className={selectClass}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Número de cuenta (solo dígitos)"
          value={account.accountNumber}
          onChange={(e) => setA('accountNumber', e.target.value.replace(/\D/g, ''))}
          className={selectClass}
        />

        <button type="submit" disabled={loading} className="vaq-btn-primary w-full rounded-lg py-2 text-sm">
          {loading ? 'Guardando…' : 'Guardar cuenta bancaria'}
        </button>
      </form>

      <div className="vaq-card space-y-3 border-[var(--vaq-danger)]/25 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--vaq-danger)]">Zona de peligro</p>

        {deleteStep === 'sent' ? (
          <div className="rounded-lg border border-[var(--vaq-card-border)] bg-[var(--vaq-callout-neutral-bg)] px-4 py-3 text-sm text-[var(--vaq-callout-neutral-text)]">
            Revisa tu correo <span className="font-medium">{user?.email}</span>. Te enviamos un enlace para confirmar la
            eliminación.
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--vaq-muted)]">
              Eliminar tu cuenta es permanente. Solo es posible si no eres organizador ni participante de ningún fondo.
            </p>
            {deleteError && <p className="text-xs text-[var(--vaq-danger)]">{deleteError}</p>}
            <button
              type="button"
              onClick={handleRequestDelete}
              disabled={deleting}
              className="vaq-btn-secondary w-full rounded-lg border-[var(--vaq-danger)]/40 py-2 text-sm text-[var(--vaq-danger)] hover:border-[var(--vaq-danger)] disabled:opacity-50"
            >
              {deleting ? 'Verificando…' : 'Eliminar mi cuenta'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
