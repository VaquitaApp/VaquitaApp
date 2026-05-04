import { useState } from 'react';
import { triggerPayment } from '../../api/contributions';
import { fmtCLP } from '../../utils/format';

const ACCOUNT_TYPE_LABELS = {
  corriente: 'Cuenta Corriente',
  vista: 'Cuenta Vista / RUT',
  ahorro: 'Cuenta de Ahorro',
  chequera_electronica: 'Chequera Electrónica',
};

export default function MockPaymentForm({ fundId, fund, collectedAmount, onSuccess, onClose }) {
  const [step, setStep] = useState('confirm');
  const [error, setError] = useState('');
  const dest = fund?.recipientAccount;

  async function handleConfirm() {
    setStep('loading');
    setError('');
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const res = await triggerPayment(fundId);
      setStep('success');
      setTimeout(() => onSuccess(res.data), 1200);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al procesar el pago');
      setStep('confirm');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--vaq-modal-backdrop)' }}>
      <div className="vaq-card mx-4 w-full max-w-sm p-6 shadow-xl">
        {step === 'loading' && (
          <div className="py-6 text-center">
            <div className="vaq-spinner mx-auto mb-3" aria-hidden />
            <p className="text-sm text-[var(--vaq-muted)]">Procesando transferencia…</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-6 text-center">
            <div className="mb-2 text-4xl">✅</div>
            <p className="font-semibold text-[var(--vaq-ink)]">Transferencia realizada</p>
            <p className="mt-1 text-xs text-[var(--vaq-muted)]">El fondo ha sido completado</p>
          </div>
        )}

        {step === 'confirm' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--vaq-ink)]">Pagar al destinatario</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-2xl leading-none text-[var(--vaq-muted)] transition-colors hover:text-[var(--vaq-ink)]"
              >
                &times;
              </button>
            </div>

            {error && <p className="mb-3 text-xs text-[var(--vaq-danger)]">{error}</p>}

            <div className="mb-4 space-y-2 rounded-lg border border-[var(--vaq-card-border)] bg-[var(--vaq-well-bg)] px-4 py-3 text-sm">
              <div>
                <p className="mb-0.5 text-xs text-[var(--vaq-muted)]">Cuenta destinataria</p>
                <p className="font-medium text-[var(--vaq-ink)]">{dest?.bank}</p>
                <p className="text-xs text-[var(--vaq-muted)]">
                  {ACCOUNT_TYPE_LABELS[dest?.accountType]} · {dest?.accountNumber}
                </p>
              </div>
              <div className="border-t border-[var(--vaq-card-border)] pt-2">
                <p className="mb-0.5 text-xs text-[var(--vaq-muted)]">Monto a transferir</p>
                <p className="text-lg font-bold text-[var(--vaq-forest)]">{fmtCLP(collectedAmount)}</p>
              </div>
            </div>

            <p className="mb-4 rounded border border-[var(--vaq-amber)]/35 bg-[var(--vaq-tone-warning-bg)] px-3 py-2 text-xs text-[var(--vaq-tone-warning-text)]">
              Simulación — ningún dato bancario real será procesado
            </p>

            <div className="flex gap-2">
              <button type="button" onClick={handleConfirm} className="vaq-btn-primary flex-1 rounded-lg py-2 text-sm font-medium">
                Confirmar transferencia
              </button>
              <button type="button" onClick={onClose} className="vaq-btn-secondary flex-1 rounded-lg py-2 text-sm font-medium">
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
