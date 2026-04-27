import { useState } from 'react';
import { triggerPayment } from '../../api/contributions';
import { fmtCLP } from '../../utils/format';

const ACCOUNT_TYPE_LABELS = {
  corriente:            'Cuenta Corriente',
  vista:                'Cuenta Vista / RUT',
  ahorro:               'Cuenta de Ahorro',
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
      await new Promise(r => setTimeout(r, 1500));
      const res = await triggerPayment(fundId);
      setStep('success');
      setTimeout(() => onSuccess(res.data), 1200);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al procesar el pago');
      setStep('confirm');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">

        {step === 'loading' && (
          <div className="text-center py-6">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Procesando transferencia…</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-gray-800">Transferencia realizada</p>
            <p className="text-xs text-gray-400 mt-1">El fondo ha sido completado</p>
          </div>
        )}

        {step === 'confirm' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Pagar al destinatario</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 space-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Cuenta destinataria</p>
                <p className="font-medium text-gray-800">{dest?.bank}</p>
                <p className="text-xs text-gray-500">
                  {ACCOUNT_TYPE_LABELS[dest?.accountType]} · {dest?.accountNumber}
                </p>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <p className="text-xs text-gray-400 mb-0.5">Monto a transferir</p>
                <p className="text-lg font-bold text-indigo-700">{fmtCLP(collectedAmount)}</p>
              </div>
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4">
              Simulación — ningún dato bancario real será procesado
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Confirmar transferencia
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-white border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:border-gray-400"
              >
                Cancelar
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
