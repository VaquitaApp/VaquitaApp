import { Link } from 'react-router-dom';
import { StatusBadge, TypeBadge } from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { fmtDate, fmtName, fmtCLP } from '../../utils/format';

function totalQuotas(fund) {
  const start = new Date(fund.createdAt);
  const end   = new Date(fund.deadline);
  if (fund.frequency === 'once') return 1;
  if (fund.frequency === 'weekly') {
    return Math.max(1, Math.floor((end - start) / (7 * 24 * 60 * 60 * 1000)) + 1);
  }
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return Math.max(1, months);
}

export default function FundCard({ fund }) {
  const isQuota = fund.type === 'quota';

  return (
    <Link to={`/fondos/${fund._id}`} className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{fund.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{fmtName(fund.organizer?.name)}</p>
        </div>
        <StatusBadge status={fund.status} />
      </div>
      <ProgressBar value={fund.collectedAmount ?? 0} max={fund.targetAmount} />
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <TypeBadge type={fund.type} />
          {isQuota && (
            <span className="text-xs text-gray-400">
              {totalQuotas(fund)} cuotas de {fmtCLP(fund.quotaAmount)}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">Cierre: {fmtDate(fund.deadline)}</span>
      </div>
      <div className="text-xs text-gray-400 mt-auto pt-2 border-t border-gray-50">
        {fund.participantCount ? `${fund.participantCount} participante${fund.participantCount !== 1 ? 's' : ''}` : 'Sin participantes'}
      </div>
    </Link>
  );
}
