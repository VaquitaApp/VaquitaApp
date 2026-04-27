import { ContributionBadge } from '../ui/Badge';
import { fmtName } from '../../utils/format';

export default function ParticipantList({ organizer, participants = [] }) {
  const hasRows = organizer || participants.length > 0;
  if (!hasRows) {
    return <p className="text-sm text-gray-400">No hay participantes aún.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium">Nombre</th>
            <th className="text-left py-2 pr-4 font-medium">Aportes</th>
          </tr>
        </thead>
        <tbody>
          {organizer && (
            <tr className="border-b border-gray-50 bg-indigo-50/40">
              <td className="py-2 pr-4">
                <p className="font-medium text-gray-800">{fmtName(organizer.name)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{organizer.email}</p>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                  Organizador
                </span>
              </td>
              <td className="py-2 pr-4">
                <span className="text-xs text-gray-300">—</span>
              </td>
            </tr>
          )}
          {participants.map(p => (
            <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 pr-4">
                <p className="font-medium text-gray-800">{fmtName(p.user?.name)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.user?.email}</p>
              </td>
              <td className="py-2 pr-4">
                {p.contributionStatus
                  ? <ContributionBadge status={p.contributionStatus} />
                  : <span className="text-xs text-gray-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
