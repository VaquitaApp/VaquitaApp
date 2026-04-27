import { useState } from 'react';
import { triggerPayment } from '../../api/contributions';

export default function MockPaymentForm({ fundId, onSuccess, onClose }) {
  const [step, setStep] = useState('form');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStep('loading');
    setError('');
    try {
      await new Promise(r => setTimeout(r, 1500));
      const res = await triggerPayment(fundId);
      setStep('success');
      setTimeout(() => onSuccess(res.data), 1200);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al procesar el pago');
      setStep('form');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        {step === 'loading' && (
          <div className="text-center py-6">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">Procesando pago…</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-gray-800">Pago realizado</p>
            <p className="text-xs text-gray-400 mt-1">El fondo ha sido completado</p>
          </div>
        )}

        {step === 'form' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Pagar al destinatario</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Número de tarjeta</label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vencimiento</label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    maxLength={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    maxLength={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Simulación — ningún dato real será procesado
              </p>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Confirmar pago
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
