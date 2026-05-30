import { Link } from 'react-router-dom';
import { StatusBadge, TypeBadge, RoleBadge } from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { fmtDate, fmtName, fmtCLP } from '../../utils/format';

function totalQuotas(fund) {
  const start = new Date(fund.createdAt);
  const end = new Date(fund.deadline);
  if (fund.frequency === 'once') return 1;
  if (fund.frequency === 'weekly') {
    return Math.max(1, Math.floor((end - start) / (7 * 24 * 60 * 60 * 1000)) + 1);
  }
  if (fund.frequency === 'biweekly') {
    return Math.max(1, Math.floor((end - start) / (14 * 24 * 60 * 60 * 1000)) + 1);
  }
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(1, months);
}

export default function FundCard({ fund, role }) {
  const isQuota = fund.type === 'quota';

  return (
    <Link
      to={`/fondos/${fund._id}`}
      className="vaq-card flex flex-col p-5 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--vaq-ink)]">{fund.name}</h3>
          {role ? (
            <div className="mt-1">
              <RoleBadge isMine={role === 'mine'} organizerName={fmtName(fund.organizer?.name)} />
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--vaq-muted)]">{fmtName(fund.organizer?.name)}</p>
          )}
        </div>
        <StatusBadge status={fund.status === 'active' && (fund.collectedAmount ?? 0) >= fund.targetAmount ? 'reached' : fund.status} />
      </div>
      {fund.goal ? (
        <p className="mb-2 line-clamp-2 text-xs text-[var(--vaq-muted)]" title={fund.goal}>
          <span className="font-medium text-[var(--vaq-ink)]">Objetivo: </span>
          {fund.goal}
        </p>
      ) : null}
      <p className="mb-2 text-xs text-[var(--vaq-muted)]">
        <span className="text-[var(--vaq-ink)]">Recaudado: </span>
        {fmtCLP(fund.collectedAmount ?? 0)}
        <span className="mx-1 text-[var(--vaq-muted)]">·</span>
        <span className="text-[var(--vaq-ink)]">Meta: </span>
        {fmtCLP(fund.targetAmount)}
      </p>
      <ProgressBar value={fund.collectedAmount ?? 0} max={fund.targetAmount} />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeBadge type={fund.type} />
          {isQuota && (
            <span className="text-xs text-[var(--vaq-muted)]">
              {totalQuotas(fund)} cuotas de {fmtCLP(fund.quotaAmount)}
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--vaq-muted)]">Cierre: {fmtDate(fund.deadline)}</span>
      </div>
      <div className="mt-auto border-t border-[var(--vaq-card-border)] pt-2 text-xs text-[var(--vaq-muted)]">
        {fund.participantCount
          ? `${fund.participantCount} participante${fund.participantCount !== 1 ? 's' : ''}`
          : 'Sin participantes'}
      </div>
    </Link>
  );
}
