import { ContributionBadge, StatusBadge } from '../ui/Badge';
import { removeParticipant } from '../../api/participants';

const PARTICIPANT_STATUS = {
  pending:  'Pendiente',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};

export default function ParticipantList({ fundId, participants = [], isOrganizer, onRemoved }) {
  if (participants.length === 0) {
    return <p className="text-sm text-gray-400">No hay participantes aún.</p>;
  }

  async function handleRemove(userId) {
    if (!window.confirm('¿Eliminar este participante?')) return;
    try {
      await removeParticipant(fundId, userId);
      onRemoved(userId);
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'Error al eliminar');
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium">Nombre</th>
            <th className="text-left py-2 pr-4 font-medium">Invitación</th>
            <th className="text-left py-2 pr-4 font-medium">Aportes</th>
            {isOrganizer && <th className="text-right py-2 font-medium">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {participants.map(p => (
            <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 pr-4">
                <p className="font-medium text-gray-800">{p.user?.name}</p>
                <p className="text-xs text-gray-400">{p.user?.email}</p>
              </td>
              <td className="py-2 pr-4">
                <span className={`text-xs font-medium ${
                  p.status === 'accepted' ? 'text-green-700' :
                  p.status === 'rejected' ? 'text-red-600' : 'text-yellow-700'
                }`}>
                  {PARTICIPANT_STATUS[p.status] ?? p.status}
                </span>
              </td>
              <td className="py-2 pr-4">
                {p.contributionStatus
                  ? <ContributionBadge status={p.contributionStatus} />
                  : <span className="text-xs text-gray-300">—</span>}
              </td>
              {isOrganizer && (
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleRemove(p.user?._id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
