const STATUS_STYLES = {
  active: 'bg-[var(--vaq-tone-success-bg)] text-[var(--vaq-tone-success-text)]',
  completed: 'bg-[var(--vaq-tone-completed-bg)] text-[var(--vaq-tone-completed-text)]',
  closed: 'bg-[var(--vaq-tone-closed-bg)] text-[var(--vaq-tone-closed-text)]',
};

const STATUS_LABELS = {
  active: 'Activo',
  completed: 'Completado',
  closed: 'Cerrado',
};

const CONTRIBUTION_STYLES = {
  onTime: 'bg-[var(--vaq-tone-success-bg)] text-[var(--vaq-tone-success-text)]',
  pending: 'bg-[var(--vaq-tone-warning-bg)] text-[var(--vaq-tone-warning-text)]',
  overdue: 'bg-[var(--vaq-tone-danger-bg)] text-[var(--vaq-tone-danger-text)]',
};

const CONTRIBUTION_LABELS = {
  onTime: 'Al día',
  pending: 'Pendiente',
  overdue: 'En mora',
};

const INVITATION_STYLES = {
  pending: 'bg-[var(--vaq-tone-warning-bg)] text-[var(--vaq-tone-warning-text)]',
  accepted: 'bg-[var(--vaq-tone-success-bg)] text-[var(--vaq-tone-success-text)]',
  rejected: 'bg-[var(--vaq-tone-danger-bg)] text-[var(--vaq-tone-danger-text)]',
};

const INVITATION_LABELS = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

const fallbackBadge = 'bg-[var(--vaq-tone-closed-bg)] text-[var(--vaq-tone-closed-text)]';

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? fallbackBadge}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function TypeBadge({ type }) {
  const isQuota = type === 'quota';
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${isQuota ? 'bg-[var(--vaq-tone-type-quota-bg)] text-[var(--vaq-tone-type-quota-text)]' : 'bg-[var(--vaq-tone-type-free-bg)] text-[var(--vaq-tone-type-free-text)]'}`}
    >
      {isQuota ? 'Por cuotas' : 'Libre'}
    </span>
  );
}

export function ContributionBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTRIBUTION_STYLES[status] ?? fallbackBadge}`}
    >
      {CONTRIBUTION_LABELS[status] ?? status}
    </span>
  );
}

export function InvitationBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INVITATION_STYLES[status] ?? fallbackBadge}`}
    >
      {INVITATION_LABELS[status] ?? status}
    </span>
  );
}

export function RoleBadge({ isMine, organizerName }) {
  if (isMine) {
    return (
      <span className="inline-flex max-w-full items-center rounded-full bg-[var(--vaq-badge-bg)] px-2 py-0.5 text-xs font-medium text-[var(--vaq-badge-fg)]">
        Organizador
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-[var(--vaq-surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--vaq-muted)]">
      <span className="truncate">
        Invitado por <span className="font-semibold text-[var(--vaq-ink)]">{organizerName}</span>
      </span>
    </span>
  );
}
