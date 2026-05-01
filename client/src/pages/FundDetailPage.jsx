import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFund, closeFund, deleteFund, sendReminders, pauseFund, resumeFund } from '../api/funds';
import { getParticipants } from '../api/participants';
import { getContributions } from '../api/contributions';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import InviteModal from '../components/funds/InviteModal';
import ParticipantList from '../components/funds/ParticipantList';
import ContributionForm from '../components/funds/ContributionForm';
import ContributionList from '../components/funds/ContributionList';
import MockPaymentForm from '../components/funds/MockPaymentForm';
import FundChart from '../components/funds/FundChart';
import CommentSection from '../components/funds/CommentSection';
import ConfirmModal from '../components/ui/ConfirmModal';

import { fmtDate, fmtName } from '../utils/format';

export default function FundDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fund, setFund] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showContribForm, setShowContribForm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmActionType, setConfirmActionType] = useState(null);

  useEffect(() => {
    Promise.all([
      getFund(id),
      getParticipants(id).then(r => r.data).catch(() => []),
      getContributions(id).then(r => r.data).catch(() => []),
    ])
      .then(([fundRes, parts, contribs]) => {
        setFund(fundRes.data);
        setParticipants(parts);
        setContributions(contribs);
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
  const isMember = isOrganizer || accepted.some(p => p.user?._id?.toString() === user?._id?.toString());
  const collectedAmount = contributions.reduce((sum, c) => sum + c.amount, 0);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setReminderMsg('Enlace copiado al portapapeles');
    setTimeout(() => setReminderMsg(''), 3000);
  }

  function handleDownloadCSV() {
    let csv = `Fondo:,"${fund.name}"\n`;
    csv += `Objetivo:,"${fund.goal}"\n`;
    csv += `Meta Total:,${fund.targetAmount}\n`;
    csv += `Recaudado:,${collectedAmount}\n`;
    csv += `Estado:,${fund.status}\n\n`;

    csv += 'Nombre,Email,Rol/Estado de Aporte\n';
    if (fund.organizer) {
      csv += `"${fund.organizer.name || ''}","${fund.organizer.email || ''}","Organizador"\n`;
    }
    accepted.forEach(p => {
      const statusStr = p.contributionStatus === 'onTime' ? 'Al dia' :
                        p.contributionStatus === 'overdue' ? 'En mora' : 'Pendiente';
      csv += `"${p.user?.name || ''}","${p.user?.email || ''}","${statusStr}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel UTF-8 BOM
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fondo_${fund.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function executeClose() {
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

  async function executeDelete() {
    setActionLoading(true);
    try {
      await deleteFund(id);
      navigate('/fondos');
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'Error al eliminar');
      setActionLoading(false);
    }
  }

  function handleClose() {
    setConfirmActionType('close');
    setConfirmModalOpen(true);
  }

  function handleDelete() {
    setConfirmActionType('delete');
    setConfirmModalOpen(true);
  }

  async function handlePause() {
    setActionLoading(true);
    try {
      const res = await pauseFund(id);
      setFund(prev => ({ ...prev, status: res.data.status }));
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'Error al pausar');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    setActionLoading(true);
    try {
      const res = await resumeFund(id);
      setFund(prev => ({ ...prev, status: res.data.status }));
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'Error al reanudar');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/fondos" className="text-gray-400 hover:text-gray-600 text-sm">← Mis fondos</Link>
      </div>

      {/* Status banners */}
      {fund.status === 'completed' && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm rounded-lg px-4 py-3 mb-4">
          Este fondo ha sido completado. Los fondos fueron transferidos al destinatario.
        </div>
      )}
      {fund.status === 'closed' && (
        <div className="bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg px-4 py-3 mb-4">
          Este fondo fue cerrado por el organizador.
        </div>
      )}
      {fund.status === 'paused' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3 mb-4">
          Este fondo se encuentra pausado por el organizador. No se reciben aportes temporalmente.
        </div>
      )}

      {/* Fund overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{fund.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Organizado por {fmtName(fund.organizer?.name)}</p>
          </div>
          <StatusBadge status={fund.status} />
        </div>

        <ProgressBar value={collectedAmount} max={fund.targetAmount} />

        <div className="grid grid-cols-2 gap-4 mt-5 text-sm text-gray-600">
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Fecha límite</span>
            {fmtDate(fund.deadline)}
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Tipo</span>
            {fund.type === 'quota'
              ? `Por cuotas (${fund.quotaAmount?.toLocaleString('es-CL')} CLP, ${fund.frequency === 'monthly' ? 'Mensual' : fund.frequency === 'biweekly' ? 'Quincenal' : fund.frequency === 'weekly' ? 'Semanal' : 'Única vez'})`
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
          {isOrganizer && fund.recipientAccount && (
            <div className="col-span-2">
              <span className="text-xs text-gray-400 block mb-0.5">Cuenta destinataria</span>
              <p className="text-sm text-gray-800 font-medium">{fund.recipientAccount.bank}</p>
              <p className="text-xs text-gray-500">
                {{ corriente: 'Cta. Corriente', vista: 'Cta. Vista / RUT', ahorro: 'Cta. de Ahorro', chequera_electronica: 'Chequera Electrónica' }[fund.recipientAccount.accountType]}
              </p>
              <p className="text-xs text-gray-500">{fund.recipientAccount.accountNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Update Logs */}
      {fund.updateLogs && fund.updateLogs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Registro de Actualizaciones</h3>
          <ul className="space-y-2">
            {fund.updateLogs.map((log, idx) => (
              <li key={idx} className="text-sm text-amber-700 flex items-start">
                <span className="mr-2 mt-0.5 opacity-60">•</span>
                <div>
                  <p>{log.message}</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    {new Date(log.date).toLocaleDateString('es-CL')} a las {new Date(log.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Participants */}
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
          organizer={fund.organizer}
          participants={participants}
        />
      </div>

      {/* Participant status summary */}
      {accepted.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-3 mb-4 text-sm text-gray-600">
          {(() => {
            const onTime = participants.filter(p => p.contributionStatus === 'onTime').length;
            return `${onTime} de ${accepted.length} participante${accepted.length !== 1 ? 's' : ''} al día`;
          })()}
        </div>
      )}

      {/* Contributions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 text-sm">Historial de aportes</h2>
          {isMember && fund.status === 'active' && !showContribForm && (
            <button
              onClick={() => setShowContribForm(true)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              + Realizar aporte
            </button>
          )}
        </div>
        {showContribForm && (
          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <ContributionForm
              fundId={id}
              fund={fund}
              userContributions={contributions.filter(
                c => c.user?._id?.toString() === user?._id?.toString()
              )}
              onCreated={c => {
                setContributions(prev => [
                  { ...c, user: { _id: user._id, name: user.name, email: user.email } },
                  ...prev,
                ]);
                setShowContribForm(false);
              }}
              onCancel={() => setShowContribForm(false)}
            />
          </div>
        )}
        <ContributionList contributions={contributions} />
        {contributions.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-gray-400 mb-2">Aportes en el tiempo</p>
            <FundChart contributions={contributions} deadline={fund.deadline} />
          </div>
        )}
      </div>

      {/* Utility Actions */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleCopyLink}
          className="bg-white border border-gray-300 hover:border-indigo-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Copiar enlace
        </button>
        {(isOrganizer || isMember) && (
          <button
            onClick={handleDownloadCSV}
            className="bg-white border border-gray-300 hover:border-indigo-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Descargar CSV
          </button>
        )}
      </div>

      <CommentSection 
        fundId={id} 
        messages={fund.messages || []} 
        isMember={isMember} 
        onMessageAdded={(newMessages) => setFund(prev => ({ ...prev, messages: newMessages }))} 
      />

      {/* Visitor notice */}
      {!isMember && fund.visibility === 'public' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3 mb-4">
          Estás visitando este fondo público. Para participar, contacta al organizador.
        </div>
      )}

      {/* Actions */}
      {(fund.status === 'active' || fund.status === 'paused') && (
        <div className="flex flex-wrap gap-3">
          {reminderMsg && (
            <p className="w-full text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5 mb-1">
              {reminderMsg}
            </p>
          )}
          {isOrganizer && (
            <>
              {fund.status === 'active' && accepted.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      const res = await sendReminders(id);
                      setReminderMsg(`Recordatorio enviado a ${res.data.sent} participante${res.data.sent !== 1 ? 's' : ''}.`);
                      setTimeout(() => setReminderMsg(''), 4000);
                    } catch {
                      setReminderMsg('Error al enviar recordatorios');
                    }
                  }}
                  className="bg-white border border-gray-300 hover:border-indigo-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Enviar recordatorio
                </button>
              )}
              {fund.status === 'active' && (
                <Link
                  to={`/fondos/${id}/editar`}
                  className="bg-white border border-gray-300 hover:border-indigo-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Editar fondo
                </Link>
              )}
              {fund.status === 'active' && collectedAmount > 0 && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Pagar al destinatario
                </button>
              )}
              {fund.status === 'active' && collectedAmount === 0 && (
                <button
                  onClick={handleClose}
                  disabled={actionLoading}
                  className="bg-white border border-amber-300 hover:border-amber-400 text-amber-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cerrar fondo
                </button>
              )}
              {fund.status === 'active' && collectedAmount === 0 && (
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="bg-white border border-red-200 hover:border-red-400 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Eliminar fondo
                </button>
              )}
              {fund.status === 'active' && (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="bg-white border border-yellow-300 hover:border-yellow-400 text-yellow-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Pausar fondo
                </button>
              )}
              {fund.status === 'paused' && (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="bg-white border border-green-300 hover:border-green-400 text-green-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Reanudar fondo
                </button>
              )}
            </>
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

      {showPayment && (
        <MockPaymentForm
          fundId={id}
          fund={fund}
          collectedAmount={collectedAmount}
          onClose={() => setShowPayment(false)}
          onSuccess={({ fund: updatedFund }) => {
            setFund(prev => ({ ...prev, status: updatedFund.status }));
            setShowPayment(false);
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          setConfirmModalOpen(false);
          if (confirmActionType === 'close') executeClose();
          if (confirmActionType === 'delete') executeDelete();
        }}
        title={confirmActionType === 'delete' ? 'Eliminar fondo' : 'Cerrar fondo'}
        message={
          confirmActionType === 'delete' 
            ? '¿Estás seguro de que deseas eliminar este fondo? Esta acción no se puede deshacer y se borrarán todos los datos asociados.' 
            : '¿Estás seguro de que deseas cerrar este fondo? Ya no se podrán recibir aportes nuevos.'
        }
        requireKeyword={true}
        keyword={confirmActionType === 'delete' ? 'ELIMINAR' : 'CERRAR'}
      />
    </div>
  );
}
