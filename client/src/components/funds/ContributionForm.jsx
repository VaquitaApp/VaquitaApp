import { useState, useEffect } from 'react';
import { createContribution } from '../../api/contributions';
import { updateProfile } from '../../api/participants';
import { useAuth } from '../../contexts/AuthContext';
import { fmtCLP } from '../../utils/format';
import { BANKS } from '../../constants/banks';
import { ACCOUNT_TYPE_LABELS } from '../../constants/accountTypes';

const fieldSelect =
  'w-full rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-2 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

function periodsElapsed(fund) {
  if (fund.frequency === 'once') return 1;
  const start = new Date(fund.createdAt);
  const now = new Date();
  if (fund.frequency === 'weekly') {
    return Math.max(1, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1);
  }
  if (fund.frequency === 'biweekly') {
    return Math.max(1, Math.floor((now - start) / (14 * 24 * 60 * 60 * 1000)) + 1);
  }
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  return Math.max(1, months);
}

function computePending(fund, userContributions) {
  const totalPaid = userContributions.reduce((s, c) => s + c.amount, 0);
  const paid = Math.floor(totalPaid / fund.quotaAmount);
  return Math.max(0, periodsElapsed(fund) - paid);
}

import { getParticipantStatus } from '../../api/funds';

export default function ContributionForm({ fundId, fund, userContributions = [], onCreated, onCancel }) {
  const { user, refreshUser } = useAuth();
  const saved = user?.preferredAccount;
  const hasSaved = saved?.bank && saved?.accountNumber;

  const isQuota = fund?.type === 'quota';
  const destination = fund?.recipientAccount;

  const [origin, setOrigin] = useState({
    bank: saved?.bank ?? '',
    accountType: saved?.accountType || 'corriente',
    accountNumber: saved?.accountNumber ?? '',
  });
  const [amount, setAmount] = useState('');
  const [quotasToPay, setQuotasToPay] = useState(1);
  const [statusObj, setStatusObj] = useState(null);
  
  useEffect(() => {
    if (isQuota && user) {
      getParticipantStatus(fundId, user._id).then(res => {
        setStatusObj(res.data);
        if (res.data.pending > 0) {
          setQuotasToPay(res.data.pending);
        }
      }).catch(console.error);
    }
  }, [isQuota, fundId, user]);

  const pending = statusObj ? statusObj.pending : 0;
  const remaining = statusObj ? statusObj.remaining : null;
  const fixedAmt = isQuota ? quotasToPay * fund.quotaAmount : null;
  const [step, setStep] = useState('form');
  const [error, setError] = useState('');
  const [successError, setSuccessError] = useState('');
  const [savedAfterSuccess, setSavedAfterSuccess] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  const isDirty =
    hasSaved &&
    (origin.bank !== saved.bank ||
      origin.accountType !== (saved.accountType || 'corriente') ||
      origin.accountNumber !== saved.accountNumber);
  const canSaveNew = !hasSaved && origin.bank && origin.accountNumber;
  const showSaveSuggestion = isDirty || canSaveNew;
  const shouldPromptSaveAfterSuccess = !hasSaved && Boolean(origin.bank && origin.accountNumber);

  function setO(key, val) {
    setOrigin((o) => ({ ...o, [key]: val }));
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
      await new Promise((r) => setTimeout(r, 1400));
      const res = await createContribution(fundId, {
        amount: isQuota ? fixedAmt : Number(amount),
        method: 'transfer',
        quotasPaid: isQuota ? quotasToPay : undefined,
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
      <div className="py-6 text-center">
        <div className="mb-2 text-3xl">✅</div>
        <p className="font-semibold text-[var(--vaq-ink)]">Estás al día</p>
        <p className="mt-1 text-xs text-[var(--vaq-muted)]">No tienes cuotas pendientes por el momento.</p>
        <button type="button" onClick={onCancel} className="vaq-link mt-4 text-xs">
          Cerrar
        </button>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="py-8 text-center">
        <div className="vaq-spinner mx-auto mb-3" aria-hidden />
        <p className="text-sm font-medium text-[var(--vaq-muted)]">Procesando transferencia…</p>
        <p className="mt-1 text-xs text-[var(--vaq-muted)]">No cierres esta ventana</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="py-8 text-center">
        <div className="mb-3 text-4xl">✅</div>
        <p className="font-semibold text-[var(--vaq-ink)]">Transferencia realizada</p>
        <p className="mt-1 text-xs text-[var(--vaq-muted)]">El aporte fue registrado correctamente</p>

        {shouldPromptSaveAfterSuccess && !savedAfterSuccess ? (
          <div className="mt-4 rounded-lg border border-[var(--vaq-callout-info-border)] bg-[var(--vaq-callout-info-bg)] px-4 py-3 text-left">
            <p className="text-xs text-[var(--vaq-callout-info-text)]">
              Usaste una cuenta que no tenías guardada. Puedes registrarla como preferida para no volver a escribirla.
            </p>
            {successError && <p className="mt-2 text-xs text-[var(--vaq-danger)]">{successError}</p>}
            <button
              type="button"
              onClick={handleSaveAccount}
              disabled={savingAccount}
              className="vaq-btn-primary mt-3 w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            >
              {savingAccount ? 'Guardando…' : 'Guardar esta cuenta en mi perfil'}
            </button>
          </div>
        ) : shouldPromptSaveAfterSuccess ? (
          <div className="mt-4 rounded-lg border border-[var(--vaq-tone-success-text)]/25 bg-[var(--vaq-tone-success-bg)] px-4 py-3 text-left">
            <p className="text-xs text-[var(--vaq-tone-success-text)]">La cuenta quedó guardada en tu perfil.</p>
          </div>
        ) : null}

        <button type="button" onClick={onCancel} className="vaq-link mt-4 text-xs">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-xs text-[var(--vaq-danger)]">{error}</p>}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--vaq-muted)]">Tu cuenta</p>
        <div className="space-y-2">
          <select value={origin.bank} onChange={(e) => setO('bank', e.target.value)} className={fieldSelect} required>
            <option value="">Selecciona un banco</option>
            {BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select value={origin.accountType} onChange={(e) => setO('accountType', e.target.value)} className={fieldSelect}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Número de cuenta (solo dígitos)"
            value={origin.accountNumber}
            onChange={(e) => setO('accountNumber', e.target.value.replace(/\D/g, ''))}
            className={fieldSelect}
            required
          />
        </div>
        {showSaveSuggestion && (
          <p className="mt-2 text-xs text-[var(--vaq-forest)]">
            {isDirty ? 'Modificaste tu cuenta.' : '¿Guardar esta cuenta para futuros aportes?'}{' '}
            <button
              type="button"
              onClick={handleSaveAccount}
              disabled={savingAccount}
              className="font-semibold underline opacity-90 hover:opacity-100 disabled:opacity-50"
            >
              {savingAccount ? 'Guardando…' : 'Guardar como cuenta preferida'}
            </button>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-[var(--vaq-forest)]">
        <div className="h-px flex-1 bg-[var(--vaq-callout-info-border)]" />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <div className="h-px flex-1 bg-[var(--vaq-callout-info-border)]" />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--vaq-muted)]">Cuenta del fondo</p>
        {destination ? (
          <div className="space-y-0.5 rounded-lg border border-[var(--vaq-card-border)] bg-[var(--vaq-well-bg)] px-3 py-2.5 text-sm text-[var(--vaq-muted)]">
            <p className="font-medium text-[var(--vaq-ink)]">{destination.bank}</p>
            <p className="text-xs">
              {ACCOUNT_TYPE_LABELS[destination.accountType]} · {destination.accountNumber}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[var(--vaq-muted)]">Sin cuenta configurada</p>
        )}
      </div>

      <div>
        {isQuota ? (
          <>
            <label className="mb-1 block text-xs font-medium text-[var(--vaq-ink)]">¿Cuántas cuotas pagarás?</label>
            <select 
              value={quotasToPay} 
              onChange={(e) => setQuotasToPay(Number(e.target.value))}
              className={fieldSelect}
            >
              {Array.from({ length: remaining || 1 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'cuota' : 'cuotas'} {n === remaining ? '(Saldo completo)' : ''}</option>
              ))}
            </select>
            <label className="mt-3 mb-1 block text-xs font-medium text-[var(--vaq-ink)]">Monto a pagar (CLP)</label>
            <div className="w-full rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-well-bg)] px-3 py-2 text-sm text-[var(--vaq-ink)]">
              {fmtCLP(fixedAmt)}
            </div>
            <p className="mt-1 text-xs text-[var(--vaq-forest)]">
              {pending > 0 ? (pending === 1 ? '1 cuota pendiente' : `${pending} cuotas pendientes`) : 'Estás al día'} ({fmtCLP(fund.quotaAmount)} c/u)
            </p>
          </>
        ) : (
          <>
            <label className="mb-1 block text-xs font-medium text-[var(--vaq-ink)]">Monto (CLP)</label>
            <input
              type="number"
              min={fund.minAmount || 1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={fieldSelect}
              required
            />
            {fund.minAmount > 0 && <p className="mt-1 text-xs text-[var(--vaq-forest)]">Monto mínimo: {fmtCLP(fund.minAmount)}</p>}
          </>
        )}
      </div>

      <p className="rounded border border-[var(--vaq-amber)]/35 bg-[var(--vaq-tone-warning-bg)] px-3 py-2 text-xs text-[var(--vaq-tone-warning-text)]">
        Simulación — ningún dato bancario real será procesado
      </p>

      <div className="flex gap-2">
        <button type="submit" className="vaq-btn-primary flex-1 rounded-lg py-2 text-sm font-medium">
          Transferir
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="vaq-btn-secondary flex-1 rounded-lg py-2 text-sm font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
