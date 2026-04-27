import { useState } from 'react';

function toDateInput(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function inputCls(disabled) {
  return `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
    disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
      : 'border-gray-300'
  }`;
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function FundForm({ initial = {}, lockedFields = [], onSubmit, loading }) {
  const [form, setForm] = useState({
    name: initial.name ?? '',
    type: initial.type ?? 'free',
    targetAmount: initial.targetAmount ?? '',
    deadline: toDateInput(initial.deadline),
    recipientAccount: initial.recipientAccount ?? '',
    visibility: initial.visibility ?? 'private',
    frequency: initial.frequency ?? 'monthly',
    quotaAmount: initial.quotaAmount ?? '',
  });

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function locked(key) {
    return lockedFields.includes(key);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = { ...form, targetAmount: Number(form.targetAmount) };
    if (form.type !== 'quota') {
      delete data.frequency;
      delete data.quotaAmount;
    } else {
      data.quotaAmount = Number(data.quotaAmount);
    }
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre" required>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          disabled={locked('name')}
          className={inputCls(locked('name'))}
          required
        />
      </Field>

      <Field label="Tipo de fondo">
        <select
          value={form.type}
          onChange={e => set('type', e.target.value)}
          disabled={locked('type')}
          className={inputCls(locked('type'))}
        >
          <option value="free">Libre (sin cuotas fijas)</option>
          <option value="quota">Por cuotas</option>
        </select>
      </Field>

      <Field label="Meta (CLP)" required>
        <input
          type="number"
          min="1"
          value={form.targetAmount}
          onChange={e => set('targetAmount', e.target.value)}
          disabled={locked('targetAmount')}
          className={inputCls(locked('targetAmount'))}
          required
        />
      </Field>

      <Field label="Fecha límite" required>
        <input
          type="date"
          value={form.deadline}
          onChange={e => set('deadline', e.target.value)}
          disabled={locked('deadline')}
          className={inputCls(locked('deadline'))}
          required
          min={new Date().toISOString().slice(0, 10)}
        />
      </Field>

      <Field label="Cuenta destinataria" required>
        <input
          type="text"
          value={form.recipientAccount}
          onChange={e => set('recipientAccount', e.target.value)}
          disabled={locked('recipientAccount')}
          className={inputCls(locked('recipientAccount'))}
          required
        />
      </Field>

      <Field label="Visibilidad">
        <select
          value={form.visibility}
          onChange={e => set('visibility', e.target.value)}
          className={inputCls(false)}
        >
          <option value="private">Privado</option>
          <option value="public">Público</option>
        </select>
      </Field>

      {form.type === 'quota' && (
        <>
          <Field label="Frecuencia de aporte">
            <select
              value={form.frequency}
              onChange={e => set('frequency', e.target.value)}
              disabled={locked('frequency')}
              className={inputCls(locked('frequency'))}
            >
              <option value="monthly">Mensual</option>
              <option value="biweekly">Quincenal</option>
              <option value="weekly">Semanal</option>
            </select>
          </Field>

          <Field label="Monto por cuota (CLP)" required>
            <input
              type="number"
              min="1"
              value={form.quotaAmount}
              onChange={e => set('quotaAmount', e.target.value)}
              disabled={locked('quotaAmount')}
              className={inputCls(locked('quotaAmount'))}
              required
            />
          </Field>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
      >
        {loading ? 'Guardando…' : 'Guardar fondo'}
      </button>
    </form>
  );
}
