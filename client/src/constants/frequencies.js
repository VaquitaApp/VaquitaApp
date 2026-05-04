export const FREQ_LABELS = {
  weekly: 'semanal',
  biweekly: 'quincenal',
  monthly: 'mensual',
  once: 'única vez',
};

export const FREQ_MIN_DAYS = { weekly: 7, biweekly: 14, monthly: 30 };

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const freqLabelCap = (freq) => capitalize(FREQ_LABELS[freq] ?? FREQ_LABELS.once);
