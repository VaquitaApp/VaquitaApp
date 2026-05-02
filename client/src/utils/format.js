const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit', month: 'long', year: 'numeric',
  timeZone: 'UTC',
});

function capMonths(s) {
  return s.split(' ').map(w => (w.toLowerCase() === 'de' ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
}

export function fmtCLP(n) {
  return clpFormatter.format(n ?? 0);
}

export function fmtDate(d) {
  return capMonths(dateFormatter.format(new Date(d)));
}

export function fmtDateLong(d) {
  return fmtDate(d);
}

export function fmtName(name) {
  if (!name) return '';
  return name.split(' ').map(w => (w ? w[0].toUpperCase() + w.slice(1) : '')).join(' ');
}
