const FIELD_LABELS = {
  name: 'Nombre',
  description: 'Descripción',
  goal: 'Objetivo',
  targetAmount: 'Meta',
  minAmount: 'Monto mínimo',
  deadline: 'Fecha límite',
  quotaAmount: 'Monto por cuota',
  frequency: 'Frecuencia',
  coverImage: 'Imagen de portada',
  visibility: 'Visibilidad',
  expectedParticipants: 'Participantes esperados',
  type: 'Tipo de fondo',
  recipientAccount: 'Cuenta destinataria',
};

const VISIBILITY_LABELS = { public: 'Pública', private: 'Privada' };
const FREQUENCY_LABELS = { once: 'Única', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };
const TYPE_LABELS = { quota: 'Por cuotas', free: 'Libre' };

const MONEY_FIELDS = new Set(['targetAmount', 'minAmount', 'quotaAmount']);
const OPAQUE_FIELDS = new Set(['description', 'goal', 'coverImage', 'recipientAccount']);

function isBlank(v) {
  return v === null || v === undefined || v === '';
}

function fmtMoney(n) {
  if (isBlank(n)) return 'sin valor';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(n));
}

function fmtDate(d) {
  if (isBlank(d)) return 'sin valor';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtPlain(v) {
  if (isBlank(v)) return 'sin valor';
  return String(v);
}

function describeChange(field, oldValue, newValue) {
  const label = FIELD_LABELS[field] || field;

  if (OPAQUE_FIELDS.has(field)) {
    return { field, label, message: `${label} actualizada` };
  }
  if (MONEY_FIELDS.has(field)) {
    return { field, label, message: `${label}: ${fmtMoney(oldValue)} → ${fmtMoney(newValue)}` };
  }
  if (field === 'deadline') {
    return { field, label, message: `${label}: ${fmtDate(oldValue)} → ${fmtDate(newValue)}` };
  }
  if (field === 'visibility') {
    return { field, label, message: `${label}: ${VISIBILITY_LABELS[oldValue] || fmtPlain(oldValue)} → ${VISIBILITY_LABELS[newValue] || fmtPlain(newValue)}` };
  }
  if (field === 'frequency') {
    return { field, label, message: `${label}: ${FREQUENCY_LABELS[oldValue] || fmtPlain(oldValue)} → ${FREQUENCY_LABELS[newValue] || fmtPlain(newValue)}` };
  }
  if (field === 'type') {
    return { field, label, message: `${label}: ${TYPE_LABELS[oldValue] || fmtPlain(oldValue)} → ${TYPE_LABELS[newValue] || fmtPlain(newValue)}` };
  }
  // name, expectedParticipants y cualquier otro campo no listado: valor crudo
  return { field, label, message: `${label}: ${fmtPlain(oldValue)} → ${fmtPlain(newValue)}` };
}

module.exports = { describeChange, FIELD_LABELS };
