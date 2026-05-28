import { ContributionBadge } from '../ui/Badge';
import { fmtName, fmtCLP } from '../../utils/format';

export default function ParticipantList({
  fund,
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

  function quotasFor(userId) {
    if (fund?.type !== 'quota') return null;
    return contributions
      .filter((c) => c.user?._id?.toString() === userId?.toString())
      .reduce((sum, c) => sum + (c.quotasPaid || Math.floor(c.amount / fund.quotaAmount)), 0);
  }

  const orgTotal = organizer ? totalFor(organizer._id) : 0;
  const orgQuotas = organizer ? quotasFor(organizer._id) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium">Nombre</th>
            <th className="text-left py-2 pr-4 font-medium">Aportes</th>
            {isOrganizer && (
              <th className="text-left py-2 pr-4 font-medium">Acciones</th>
            )}
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
                <p className="font-medium text-gray-700">{fmtCLP(orgTotal)}</p>
                {orgQuotas !== null && <p className="text-xs text-[var(--vaq-muted)]">Ha pagado {orgQuotas} cuotas</p>}
              </td>
              {isOrganizer && (
                <td className="py-2 pr-4">
                  <span className="text-xs text-gray-300">—</span>
                </td>
              )}
            </tr>
          )}
          {visible.map((p) => {
            const total = totalFor(p.user?._id);
            const quotas = quotasFor(p.user?._id);

            return (
              <tr key={p._id} className="border-b border-[var(--vaq-card-border)] hover:bg-[var(--vaq-well-bg)]">
                <td className="py-2 pr-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-800">{fmtName(p.user?.name)}</p>
                      {p.contributionStatus && p.contributionStatus !== 'overdue' ? (
                        <ContributionBadge status={p.contributionStatus} />
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{p.user?.email}</p>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <p className="font-medium text-gray-700">{fmtCLP(total)}</p>
                  {quotas !== null && <p className="text-xs text-[var(--vaq-muted)]">Ha pagado {quotas} cuotas</p>}
                </td>
                {isOrganizer && (
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => onRemove?.(p.user?._id?.toString())}
                      disabled={removingId === p.user?._id?.toString()}
                      className="text-xs text-[var(--vaq-danger)] underline opacity-90 hover:opacity-100 disabled:opacity-50"
                    >
                      {removingId === p.user?._id?.toString() ? 'Eliminando…' : 'Eliminar participante'}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
