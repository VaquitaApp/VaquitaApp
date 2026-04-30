const STATUS_STYLES = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-indigo-100 text-indigo-700',
  closed:    'bg-gray-100 text-gray-500',
};

const STATUS_LABELS = {
  active:    'Activo',
  completed: 'Completado',
  closed:    'Cerrado',
};

const CONTRIBUTION_STYLES = {
  onTime:  'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

const CONTRIBUTION_LABELS = {
  onTime:  'Al día',
  pending: 'Pendiente',
  overdue: 'En mora',
};

const INVITATION_STYLES = {
  pending:  'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const INVITATION_LABELS = {
  pending:  'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function TypeBadge({ type }) {
  const isQuota = type === 'quota';
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium ${isQuota ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
      {isQuota ? 'Por cuotas' : 'Libre'}
    </span>
  );
}

export function ContributionBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CONTRIBUTION_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {CONTRIBUTION_LABELS[status] ?? status}
    </span>
  );
}

export function InvitationBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${INVITATION_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {INVITATION_LABELS[status] ?? status}
    </span>
  );
}
