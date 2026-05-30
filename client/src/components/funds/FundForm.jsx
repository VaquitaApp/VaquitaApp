import { useState } from 'react';
import './FundForm.css';
import { BANKS } from '../../constants/banks';
import { ACCOUNT_TYPES } from '../../constants/accountTypes';
import { FREQ_LABELS, FREQ_MIN_DAYS } from '../../constants/frequencies';

function toDateInput(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function totalPeriods(frequency, start, end) {
  if (frequency === 'once') return 1;
  const s = new Date(start);
  const e = new Date(end);
  if (frequency === 'weekly')   return Math.max(1, Math.ceil((e - s) / (7  * 24 * 60 * 60 * 1000)));
  if (frequency === 'biweekly') return Math.max(1, Math.ceil((e - s) / (14 * 24 * 60 * 60 * 1000)));
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(1, months);
}

// Menor divisor de `target` que sea >= `q` (para sugerir una cuota que divida la meta).
function nearestDivisorAtLeast(target, q) {
  if (!target || !q || q < 1) return target || null;
  let best = target; // target siempre se divide a sí mismo
  for (let i = 1; i * i <= target; i++) {
    if (target % i === 0) {
      const a = i, b = target / i;
      if (a >= q && a < best) best = a;
      if (b >= q && b < best) best = b;
    }
  }
  return best;
}

function Field({ label, required, children }) {
  return (
    <div className="fund-form-group">
      <label className="fund-form-label">
        {label}
        {required && <span className="fund-form-required">*</span>}
      </label>
      {children}
    </div>
  );
}


export default function FundForm({ initial = {}, lockedFields = [], onSubmit, loading, submitLabel = 'Crear Fondo Colectivo' }) {
  const [validationError, setValidationError] = useState('');
  const [form, setForm] = useState({
    name: initial.name ?? '',
    description: initial.description ?? '',
    goal: initial.goal ?? '',
    type: initial.type ?? 'free',
    targetAmount: initial.targetAmount ?? '',
    minAmount: initial.minAmount ?? '',
    deadline: toDateInput(initial.deadline),
    recipientAccount: {
      bank:          initial.recipientAccount?.bank          ?? '',
      accountType:   initial.recipientAccount?.accountType   ?? 'corriente',
      accountNumber: initial.recipientAccount?.accountNumber ?? '',
    },
    visibility: initial.visibility ?? 'public',
    frequency: initial.frequency ?? 'monthly',
    quotaAmount: initial.quotaAmount ?? '',
    expectedParticipants: initial.expectedParticipants ?? '',
    milestones: initial.milestones ?? [],
  });

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function setAccount(key, val) {
    setForm(f => ({ ...f, recipientAccount: { ...f.recipientAccount, [key]: val } }));
  }

  function locked(key) {
    return lockedFields.includes(key);
  }

  // Fecha de inicio para el cálculo de períodos:
  // en modo edición usa la fecha de creación del fondo; en creación usa hoy
  const startDate = initial.createdAt ? new Date(initial.createdAt) : new Date();

  const periods =
    form.type === 'quota' && form.targetAmount && form.deadline && form.frequency
      ? totalPeriods(form.frequency, startDate, form.deadline)
      : null;

  const expectedP = Number(form.expectedParticipants);
  const suggestedQuota =
    periods && expectedP > 0
      ? Math.ceil(Number(form.targetAmount) / (periods * expectedP))
      : null;

  const targetNum = Number(form.targetAmount);
  const quotaNum = Number(form.quotaAmount);
  const quotaIndivisible =
    form.type === 'quota' && targetNum > 0 && quotaNum > 0 && targetNum % quotaNum !== 0;
  const divisorSuggestion = quotaIndivisible ? nearestDivisorAtLeast(targetNum, quotaNum) : null;

  // Hitos con monto repetido (comparado como número, ignorando vacíos) → feedback inline.
  const milestoneAmountCounts = form.milestones.reduce((acc, m) => {
    if (m.amount !== '' && m.amount != null) {
      const a = Number(m.amount);
      acc[a] = (acc[a] || 0) + 1;
    }
    return acc;
  }, {});
  const hasDuplicateMilestone = Object.values(milestoneAmountCounts).some(c => c > 1);
  const isDuplicateMilestone = m =>
    m.amount !== '' && m.amount != null && milestoneAmountCounts[Number(m.amount)] > 1;

  // Hito cuyo monto iguala o supera la meta total → feedback inline.
  const milestoneExceedsTarget = m =>
    m.amount !== '' && m.amount != null && targetNum > 0 && Number(m.amount) >= targetNum;
  const hasMilestoneOverTarget = form.milestones.some(milestoneExceedsTarget);

  function handleSubmit(e) {
    e.preventDefault();
    setValidationError('');
    const data = { ...form, targetAmount: Number(form.targetAmount) };
    if (form.type !== 'quota') {
      delete data.frequency;
      delete data.quotaAmount;
      if (data.minAmount) {
        data.minAmount = Number(data.minAmount);
        if (data.minAmount > data.targetAmount) {
          setValidationError('El monto mínimo no puede ser mayor al total del fondo.');
          return;
        }
      } else {
        delete data.minAmount;
      }
    } else {
      delete data.minAmount;
      data.quotaAmount = Number(data.quotaAmount);
      if (form.expectedParticipants) {
        data.expectedParticipants = Number(form.expectedParticipants);
      } else {
        delete data.expectedParticipants;
      }
      if (form.deadline && form.frequency) {
        const minDays  = FREQ_MIN_DAYS[form.frequency] ?? 0;
        const todayStr = new Date().toLocaleDateString('en-CA');
        const diffDays = (new Date(form.deadline) - new Date(todayStr)) / 86400000;
        if (diffDays < minDays) {
          setValidationError(`Un fondo con frecuencia ${FREQ_LABELS[form.frequency]} requiere al menos ${minDays} días hasta la fecha límite.`);
          return;
        }
      }
      if (suggestedQuota !== null && data.quotaAmount < suggestedQuota) {
        setValidationError(
          `La cuota mínima es $${suggestedQuota.toLocaleString('es-CL')} para alcanzar la meta en ${periods} cuota${periods !== 1 ? 's' : ''} con ${expectedP} participante${expectedP !== 1 ? 's' : ''}.`
        );
        return;
      }
      if (data.targetAmount % data.quotaAmount !== 0) {
        const sug = nearestDivisorAtLeast(data.targetAmount, data.quotaAmount);
        setValidationError(
          `El valor de la cuota debe dividir exactamente la meta ($${data.targetAmount.toLocaleString('es-CL')}). Prueba con $${sug.toLocaleString('es-CL')}.`
        );
        return;
      }
    }
    if (data.milestones && data.milestones.length > 0) {
      for (const m of data.milestones) {
        if (!m.amount || !m.description) {
          setValidationError('Todos los hitos deben tener descripción y monto.');
          return;
        }
        if (Number(m.amount) >= data.targetAmount) {
          setValidationError('El monto de un hito debe ser menor a la meta total.');
          return;
        }
      }
      data.milestones = data.milestones.map(m => ({ ...m, amount: Number(m.amount) })).sort((a,b) => a.amount - b.amount);
    }

    onSubmit(data);
  }

  // Fechas mínima y máxima para el campo de fecha límite.
  // Para fondos de cuota, el mínimo es la duración de un período completo.
  const today = new Date();
  const deadlineMinDays = form.type === 'quota' ? (FREQ_MIN_DAYS[form.frequency] ?? 1) : 1;
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + deadlineMinDays);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  // Días entre hoy y el plazo elegido (para deshabilitar frecuencias que no caben en el plazo).
  const daysToDeadline = form.deadline
    ? (new Date(form.deadline) - new Date(new Date().toLocaleDateString('en-CA'))) / 86400000
    : null;

  return (
    <div className="fund-form-container">
      <form onSubmit={handleSubmit}>
        <Field label="Nombre del Fondo" required>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            disabled={locked('name')}
            className="fund-form-input"
            placeholder="Ej: Regalo de Cumpleaños para Ana"
            required
          />
        </Field>

        <div className="fund-form-row">
          <Field label="Objetivo" required>
            <input
              type="text"
              value={form.goal}
              onChange={e => set('goal', e.target.value)}
              disabled={locked('goal')}
              className="fund-form-input"
              placeholder="¿Qué quieres lograr?"
              required
            />
          </Field>
          
          <Field label="Visibilidad">
            <select
              value={form.visibility}
              onChange={e => set('visibility', e.target.value)}
              className="fund-form-input fund-form-select"
            >
              <option value="private">Privado (Solo con enlace/invitación)</option>
              <option value="public">Público (Visible en el directorio)</option>
            </select>
          </Field>
        </div>

        <Field label="Descripción" required>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            disabled={locked('description')}
            className="fund-form-input"
            placeholder="Cuéntanos más detalles sobre este fondo..."
            required
            rows={3}
          />
        </Field>

        <div className="fund-form-row">
          <Field label="Tipo de recolección">
            <select
              value={form.type}
              onChange={e => set('type', e.target.value)}
              disabled={locked('type')}
              className="fund-form-input fund-form-select"
            >
              <option value="free">Libre (Montos a elección del participante)</option>
              <option value="quota">Por cuotas (Monto fijo obligatorio)</option>
            </select>
          </Field>

          <Field label="Meta Total (CLP)" required>
            <input
              type="number"
              min="1"
              value={form.targetAmount}
              onChange={e => set('targetAmount', e.target.value)}
              disabled={locked('targetAmount')}
              className="fund-form-input"
              placeholder="Monto esperado"
              required
            />
          </Field>
        </div>

        <Field label="Fecha límite" required>
          <input
            type="date"
            value={form.deadline}
            onChange={e => set('deadline', e.target.value)}
            disabled={locked('deadline')}
            className="fund-form-input"
            required
            min={minDate.toLocaleDateString('en-CA')}
            max={maxDate.toLocaleDateString('en-CA')}
          />
        </Field>

        {form.type === 'quota' && (
          <div className="fund-form-row">
            <Field label="Frecuencia de aporte">
              <select
                value={form.frequency}
                onChange={e => set('frequency', e.target.value)}
                disabled={locked('frequency')}
                className="fund-form-input fund-form-select"
              >
                {[
                  { value: 'monthly', label: 'Mensual' },
                  { value: 'biweekly', label: 'Quincenal' },
                  { value: 'weekly', label: 'Semanal' },
                ].map(o => {
                  const noCabe = daysToDeadline != null && FREQ_MIN_DAYS[o.value] > daysToDeadline;
                  return (
                    <option key={o.value} value={o.value} disabled={noCabe}>
                      {o.label}{noCabe ? ` — necesita ≥${FREQ_MIN_DAYS[o.value]} días` : ''}
                    </option>
                  );
                })}
              </select>
            </Field>

            <Field label="Monto por cuota (CLP)" required>
              <input
                type="number"
                min={suggestedQuota || 1}
                value={form.quotaAmount}
                onChange={e => set('quotaAmount', e.target.value)}
                disabled={locked('quotaAmount')}
                className="fund-form-input"
                placeholder="Monto fijo"
                required
              />
              {suggestedQuota && !locked('quotaAmount') && (
                <p className="fund-form-hint">
                  Mínimo sugerido: ${suggestedQuota.toLocaleString('es-CL')} / cuota ({periods} cuota{periods !== 1 ? 's' : ''}, {expectedP} participante{expectedP !== 1 ? 's' : ''}).{' '}
                  <button type="button" onClick={() => set('quotaAmount', suggestedQuota)}>Usar este valor</button>
                </p>
              )}
              {quotaIndivisible && !locked('quotaAmount') && (
                <p className="fund-form-hint text-[var(--vaq-danger)]">
                  La cuota debe dividir exactamente la meta. Sugerencia: ${divisorSuggestion?.toLocaleString('es-CL')}.{' '}
                  <button type="button" onClick={() => set('quotaAmount', divisorSuggestion)}>Usar este valor</button>
                </p>
              )}
            </Field>
          </div>
        )}

        {form.type === 'quota' && !locked('expectedParticipants') && (
          <div className="fund-form-row">
            <Field label="Participantes esperados (para estimar cuota)">
              <input
                type="number"
                min="1"
                step="1"
                value={form.expectedParticipants}
                onChange={e => set('expectedParticipants', e.target.value)}
                className="fund-form-input"
                placeholder="Ej: 5"
              />
            </Field>
          </div>
        )}

        {form.type === 'free' && (
          <div className="fund-form-row">
            <Field label="Monto mínimo de aporte (CLP) - Opcional">
              <input
                type="number"
                min="1"
                value={form.minAmount}
                onChange={e => set('minAmount', e.target.value)}
                disabled={locked('minAmount')}
                className="fund-form-input"
                placeholder="Sin mínimo"
              />
            </Field>
          </div>
        )}

        <div className="fund-form-group">
          <label className="fund-form-label">Metas Parciales (Hitos) - Opcional</label>
          <p className="text-xs text-[var(--vaq-muted)] mb-3">Establece hitos intermedios para motivar a los participantes.</p>
          {form.milestones.map((m, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={m.description}
                  onChange={e => {
                    const newM = [...form.milestones];
                    newM[idx].description = e.target.value;
                    set('milestones', newM);
                  }}
                  className="fund-form-input mb-1"
                  placeholder="Ej: Compra de materiales"
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  min="1"
                  value={m.amount}
                  onChange={e => {
                    const newM = [...form.milestones];
                    newM[idx].amount = e.target.value;
                    set('milestones', newM);
                  }}
                  className="fund-form-input"
                  placeholder="Monto"
                />
                {milestoneExceedsTarget(m) ? (
                  <p className="text-xs text-[var(--vaq-danger)] mt-1">Debe ser menor a la meta</p>
                ) : isDuplicateMilestone(m) && (
                  <p className="text-xs text-[var(--vaq-danger)] mt-1">Monto repetido</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newM = form.milestones.filter((_, i) => i !== idx);
                  set('milestones', newM);
                }}
                className="px-2 py-2 text-[var(--vaq-danger)] opacity-80 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('milestones', [...form.milestones, { description: '', amount: '' }])}
            className="text-xs font-medium text-[var(--vaq-ring)] hover:underline"
          >
            + Añadir hito
          </button>
        </div>

        <Field label="Cuenta Destinataria (Para el retiro de fondos)" required>
          <div className={`fund-form-account-group ${locked('recipientAccount') ? 'opacity-60 pointer-events-none' : ''}`}>
            <div className="fund-form-row">
              <select
                value={form.recipientAccount.bank}
                onChange={e => setAccount('bank', e.target.value)}
                className="fund-form-input fund-form-select"
                required
              >
                <option value="">Selecciona un banco</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                value={form.recipientAccount.accountType}
                onChange={e => setAccount('accountType', e.target.value)}
                className="fund-form-input fund-form-select"
                required
              >
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              placeholder="Número de cuenta (solo dígitos)"
              value={form.recipientAccount.accountNumber}
              onChange={e => setAccount('accountNumber', e.target.value.replace(/\D/g, ''))}
              className="fund-form-input"
              required
            />
          </div>
        </Field>

        {validationError && (
          <div className="fund-form-error-text">
            {validationError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || hasDuplicateMilestone || hasMilestoneOverTarget}
          className="fund-form-submit"
        >
          {loading ? 'Procesando...' : submitLabel}
        </button>
      </form>
    </div>
  );
}
