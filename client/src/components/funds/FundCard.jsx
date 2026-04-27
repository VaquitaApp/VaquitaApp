import { Link } from 'react-router-dom';
import { StatusBadge } from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';

function fmt(d) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FundCard({ fund }) {
  return (
    <Link to={`/fondos/${fund._id}`} className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{fund.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{fund.organizer?.name}</p>
        </div>
        <StatusBadge status={fund.status} />
      </div>
      <ProgressBar value={fund.collectedAmount ?? 0} max={fund.targetAmount} />
      <div className="flex justify-between text-xs text-gray-400 mt-3">
        <span>{fund.participantCount ?? 0} participantes</span>
        <span>Cierre: {fmt(fund.deadline)}</span>
      </div>
    </Link>
  );
}
