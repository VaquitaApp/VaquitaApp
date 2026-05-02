import { useState } from 'react';
import { createContribution } from '../../api/contributions';
import { updateProfile } from '../../api/participants';
import { useAuth } from '../../contexts/AuthContext';
import { fmtCLP } from '../../utils/format';

const BANKS = [
  'Banco de Chile', 'Banco Santander', 'BCI', 'Scotiabank Chile',
  'Banco Estado', 'BICE', 'Itaú Chile', 'Banco Security',
  'Banco Falabella', 'Banco Ripley', 'Banco Consorcio',
  'Banco Internacional', 'Banco BTG Pactual', 'HSBC Bank Chile',
];

const ACCOUNT_TYPE_LABELS = {
  corriente: 'Cuenta Corriente',
  vista: 'Cuenta Vista / RUT',
  ahorro: 'Cuenta de Ahorro',
  chequera_electronica: 'Chequera Electrónica',
};

function periodsElapsed(fund) {
  if (fund.frequency === 'once') return 1;
  const start = new Date(fund.createdAt);
  const now = new Date();
  if (fund.frequency === 'weekly') {
    return Math.max(1, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1);
  }
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) + 1;
  return Math.max(1, months);
}

function computePending(fund, userContributions) {
  const totalPaid = userContributions.reduce((s, c) => s + c.amount, 0);
  const paid = Math.floor(totalPaid / fund.quotaAmount);
  return Math.max(0, periodsElapsed(fund) - paid);
}

export default function ContributionForm({ fundId, fund, userContributions = [], onCreated, onCancel }) {
  const { user, refreshUser } = useAuth();
  const saved = user?.preferredAccount;
  const hasSaved = saved?.bank && saved?.accountNumber;

  const isQuota = fund?.type === 'quota';
  const pending = isQuota ? computePending(fund, userContributions) : null;
  const fixedAmt = isQuota ? pending * fund.quotaAmount : null;
  const destination = fund?.recipientAccount;

  const [origin, setOrigin] = useState({
    bank: saved?.bank ?? '',
    accountType: saved?.accountType || 'corriente',
    accountNumber: saved?.accountNumber ?? '',
  });
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('form');
  const [error, setError] = useState('');
  const [successError, setSuccessError] = useState('');
  const [savedAfterSuccess, setSavedAfterSuccess] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const isDirty = hasSaved && (
    origin.bank !== saved.bank ||
    origin.accountType !== (saved.accountType || 'corriente') ||
    origin.accountNumber !== saved.accountNumber
  );
  const canSaveNew = !hasSaved && origin.bank && origin.accountNumber;
  const showSaveSuggestion = isDirty || canSaveNew;
  const shouldPromptSaveAfterSuccess = !hasSaved && Boolean(origin.bank && origin.accountNumber);

  function setO(key, val) {
    setOrigin(o => ({ ...o, [key]: val }));
  }

  async function handleSaveAccount() {
    setSuccessError('');
    setSavingAccount(true);
    try {
      await updateProfile({ preferredAccount: origin });
      await refreshUser();
      setSavedAfterSuccess(true);
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStep('processing');
    setError('');
    try {
      await new Promise(r => setTimeout(r, 1400));
      const res = await createContribution(fundId, {
        amount: isQuota ? fixedAmt : Number(amount),
        method: 'transfer',
      });
      setStep('success');
      if (shouldPromptSaveAfterSuccess) {
        onCreated(res.data, { keepOpen: true });
      } else {
        setTimeout(() => onCreated(res.data, { keepOpen: false }), 1200);
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al procesar la transferencia');
      setStep('form');
    }
  }

  if (isQuota && pending === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">✅</div>
        <p className="font-semibold text-gray-800">Estás al día</p>
        <p className="text-xs text-gray-400 mt-1">No tienes cuotas pendientes por el momento.</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 text-xs text-indigo-600 hover:text-indigo-800 underline"
        >
          Cerrar
        </button>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-600 font-medium">Procesando transferencia…</p>
        <p className="text-xs text-gray-400 mt-1">No cierres esta ventana</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-semibold text-gray-800">Transferencia realizada</p>
        <p className="text-xs text-gray-400 mt-1">El aporte fue registrado correctamente</p>

        {shouldPromptSaveAfterSuccess && !savedAfterSuccess ? (
          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-left">
            <p className="text-xs text-indigo-700">
              Usaste una cuenta que no tenías guardada. Puedes registrarla como preferida para no volver a escribirla.
            </p>
            {successError && <p className="mt-2 text-xs text-red-500">{successError}</p>}
            <button
              type="button"
              onClick={handleSaveAccount}
              disabled={savingAccount}
              className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingAccount ? 'Guardando…' : 'Guardar esta cuenta en mi perfil'}
            </button>
          </div>
        ) : shouldPromptSaveAfterSuccess ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-left">
            <p className="text-xs text-green-700">La cuenta quedó guardada en tu perfil.</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 text-xs text-indigo-600 underline hover:text-indigo-800"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Origin account */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tu cuenta</p>
        <div className="space-y-2">
          <select
            value={origin.bank}
            onChange={e => setO('bank', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          >
            <option value="">Selecciona un banco</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            value={origin.accountType}
            onChange={e => setO('accountType', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) =>
              <option key={v} value={v}>{l}</option>
            )}
          </select>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Número de cuenta (solo dígitos)"
            value={origin.accountNumber}
            onChange={e => setO('accountNumber', e.target.value.replace(/\D/g, ''))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
        </div>
        {showSaveSuggestion && (
          <p className="text-xs text-indigo-600 mt-2">
            {isDirty ? 'Modificaste tu cuenta.' : '¿Guardar esta cuenta para futuros aportes?'}{' '}
            <button
              type="button"
              onClick={handleSaveAccount}
              disabled={savingAccount}
              className="underline hover:text-indigo-800 disabled:opacity-50"
            >
              {savingAccount ? 'Guardando…' : 'Guardar como cuenta preferida'}
            </button>
          </p>
        )}
      </div>

      {/* Transfer arrow */}
      <div className="flex items-center gap-2 text-indigo-400">
        <div className="flex-1 h-px bg-indigo-100" />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <div className="flex-1 h-px bg-indigo-100" />
      </div>

      {/* Destination account */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cuenta del fondo</p>
        {destination ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-800">{destination.bank}</p>
            <p className="text-xs text-gray-500">
              {ACCOUNT_TYPE_LABELS[destination.accountType]} · {destination.accountNumber}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Sin cuenta configurada</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Monto (CLP)</label>
        {isQuota ? (
          <>
            <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
              {fmtCLP(fixedAmt)}
            </div>
            <p className="text-xs text-indigo-600 mt-1">
              {pending === 1
                ? '1 cuota pendiente'
                : `${pending} cuotas pendientes (${fmtCLP(fund.quotaAmount)} c/u)`}
            </p>
          </>
        ) : (
          <>
            <input
              type="number"
              min={fund.minAmount || 1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            {fund.minAmount > 0 && (
              <p className="text-xs text-indigo-600 mt-1">
                Monto mínimo: {fmtCLP(fund.minAmount)}
              </p>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        Simulación — ningún dato bancario real será procesado
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Transferir
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:border-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
