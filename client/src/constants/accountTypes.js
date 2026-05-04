export const ACCOUNT_TYPE_LABELS = {
  corriente: 'Cuenta Corriente',
  vista: 'Cuenta Vista / RUT',
  ahorro: 'Cuenta de Ahorro',
  chequera_electronica: 'Chequera Electrónica',
};

export const ACCOUNT_TYPES = Object.entries(ACCOUNT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);
