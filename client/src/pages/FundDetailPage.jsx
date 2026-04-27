import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFund, closeFund, deleteFund } from '../api/funds';
import { getParticipants } from '../api/participants';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import InviteModal from '../components/funds/InviteModal';
import ParticipantList from '../components/funds/ParticipantList';

function fmt(d) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FundDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fund, setFund] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    Promise.all([getFund(id), getParticipants(id)])
      .then(([fundRes, partRes]) => {
        setFund(fundRes.data);
        setParticipants(partRes.data);
      })
      .catch(() => setError('Fondo no encontrado o sin acceso'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-gray-400">Cargando…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!fund) return null;

  const organizerId = fund.organizer?._id?.toString() ?? fund.organizer?.toString();
  const isOrganizer = user && organizerId === user._id?.toString();
  const accepted = participants.filter(p => p.status === 'accepted');

  async function handleClose() {
    if (!window.confirm('¿Cerrar este fondo? Esta acción no se puede deshacer.')) return;
    setActionLoading(true);
    try {
      const res = await closeFund(id);
      setFund(prev => ({ ...prev, status: res.data.status }));
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'Error al cerrar');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este fondo? Esta acción no se puede deshacer.')) return;
    setActionLoading(true);
    try {
      await deleteFund(id);
      navigate('/fondos');
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'Error al eliminar');
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/fondos" className="text-gray-400 hover:text-gray-600 text-sm">← Mis fondos</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{fund.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Organizado por {fund.organizer?.name}</p>
          </div>
          <StatusBadge status={fund.status} />
        </div>

        <ProgressBar value={fund.collectedAmount ?? 0} max={fund.targetAmount} />

        <div className="grid grid-cols-2 gap-4 mt-5 text-sm text-gray-600">
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Fecha límite</span>
            {fmt(fund.deadline)}
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Tipo</span>
            {fund.type === 'quota'
              ? `Por cuotas (${fund.quotaAmount?.toLocaleString('es-CL')} CLP)`
              : 'Libre'}
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Participantes</span>
            {accepted.length}
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Visibilidad</span>
            {fund.visibility === 'public' ? 'Público' : 'Privado'}
          </div>
        </div>
      </div>

      {/* Participant section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 text-sm">Participantes</h2>
          {isOrganizer && fund.status === 'active' && (
            <button
              onClick={() => setShowInvite(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              + Invitar
            </button>
          )}
        </div>
        <ParticipantList
          fundId={id}
          participants={participants}
          isOrganizer={isOrganizer}
          onRemoved={userId => setParticipants(prev => prev.filter(p => p.user?._id !== userId))}
        />
      </div>

      {isOrganizer && (
        <div className="flex flex-wrap gap-3">
          {fund.status === 'active' && (
            <Link
              to={`/fondos/${id}/editar`}
              className="bg-white border border-gray-300 hover:border-indigo-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Editar fondo
            </Link>
          )}
          {fund.status === 'active' && (
            <button
              onClick={handleClose}
              disabled={actionLoading}
              className="bg-white border border-amber-300 hover:border-amber-400 text-amber-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Cerrar fondo
            </button>
          )}
          {(fund.collectedAmount ?? 0) === 0 && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-white border border-red-200 hover:border-red-400 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Eliminar fondo
            </button>
          )}
        </div>
      )}

      {showInvite && (
        <InviteModal
          fundId={id}
          existingParticipants={participants}
          onClose={() => setShowInvite(false)}
          onInvited={updated => {
            setParticipants(updated);
            setShowInvite(false);
          }}
        />
      )}
    </div>
  );
}
