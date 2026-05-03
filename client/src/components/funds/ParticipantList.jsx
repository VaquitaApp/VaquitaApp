import { ContributionBadge } from '../ui/Badge';
import { fmtName, fmtCLP } from '../../utils/format';

export default function ParticipantList({
  organizer,
  participants = [],
  contributions = [],
  isOrganizer = false,
  onRemove,
  removingId,
  emptyMessage = 'No hay participantes aún.',
}) {
  const visible = participants.filter((p) => p.status === 'accepted');
  const hasRows = organizer || visible.length > 0;
  if (!hasRows) {
    return <p className="text-sm text-[var(--vaq-muted)]">{emptyMessage}</p>;
  }

  function totalFor(userId) {
    return contributions
      .filter((c) => c.user?._id?.toString() === userId?.toString())
      .reduce((sum, c) => sum + c.amount, 0);
  }

  const orgTotal = organizer ? totalFor(organizer._id) : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--vaq-card-border)] text-xs text-[var(--vaq-muted)]">
            <th className="py-2 pr-4 text-left font-medium">Nombre</th>
            <th className="py-2 pr-4 text-left font-medium">Aportes</th>
            <th className="py-2 pr-4 text-left font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {organizer && (
            <tr className="border-b border-[var(--vaq-card-border)] bg-[var(--vaq-callout-info-bg)]/60">
              <td className="py-2 pr-4">
                <p className="font-medium text-[var(--vaq-ink)]">{fmtName(organizer.name)}</p>
                <p className="mt-0.5 text-xs text-[var(--vaq-muted)]">{organizer.email}</p>
                <span className="mt-1 inline-block rounded-full bg-[var(--vaq-tone-completed-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--vaq-tone-completed-text)]">
                  Organizador
                </span>
              </td>
              <td className="py-2 pr-4">
                {orgTotal > 0 ? (
                  <p className="font-medium text-[var(--vaq-ink)]">{fmtCLP(orgTotal)}</p>
                ) : (
                  <span className="text-xs text-[var(--vaq-muted)]">—</span>
                )}
              </td>
              <td className="py-2 pr-4">
                <span className="text-xs text-[var(--vaq-muted)]">—</span>
              </td>
            </tr>
          )}
          {visible.map((p) => {
            const total = totalFor(p.user?._id);

            return (
              <tr key={p._id} className="border-b border-[var(--vaq-card-border)] hover:bg-[var(--vaq-well-bg)]">
                <td className="py-2 pr-4">
                  <p className="font-medium text-[var(--vaq-ink)]">{fmtName(p.user?.name)}</p>
                  <p className="mt-0.5 text-xs text-[var(--vaq-muted)]">{p.user?.email}</p>
                </td>
                <td className="py-2 pr-4">
                  {total > 0 && <p className="font-medium text-[var(--vaq-ink)]">{fmtCLP(total)}</p>}
                  {p.contributionStatus ? (
                    <ContributionBadge status={p.contributionStatus} />
                  ) : (p.contributionCount ?? 0) > 0 ? (
                    <span className="text-xs text-[var(--vaq-muted)]">{p.contributionCount}</span>
                  ) : (
                    <span className="text-xs text-[var(--vaq-muted)]">—</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {isOrganizer ? (
                    <button
                      type="button"
                      onClick={() => onRemove?.(p.user?._id?.toString())}
                      disabled={removingId === p.user?._id?.toString()}
                      className="text-xs text-[var(--vaq-danger)] underline opacity-90 hover:opacity-100 disabled:opacity-50"
                    >
                      {removingId === p.user?._id?.toString() ? 'Eliminando…' : 'Eliminar participante'}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--vaq-muted)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
