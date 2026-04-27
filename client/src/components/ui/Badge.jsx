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

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {STATUS_LABELS[status] ?? status}
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
