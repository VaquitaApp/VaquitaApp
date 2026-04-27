import { useState } from 'react';
import { createContribution } from '../../api/contributions';

export default function ContributionForm({ fundId, onCreated, onCancel }) {
  const [form, setForm] = useState({
    amount: '',
    method: 'transfer',
    date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await createContribution(fundId, { ...form, amount: Number(form.amount) });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al registrar aporte');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Monto (CLP)</label>
        <input
          type="number"
          min="1"
          value={form.amount}
          onChange={e => set('amount', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Método</label>
        <select
          value={form.method}
          onChange={e => set('method', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="transfer">Transferencia</option>
          <option value="cash">Efectivo</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
        <input
          type="date"
          value={form.date}
          onChange={e => set('date', e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Guardando…' : 'Registrar aporte'}
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
