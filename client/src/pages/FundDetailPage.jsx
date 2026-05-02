import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFund, closeFund, deleteFund, sendReminders, pauseFund, resumeFund } from '../api/funds';
import { getParticipants, removeParticipant, requestFundAccess, acceptMyInvitation } from '../api/participants';
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

const FREQ_LABELS = { monthly: 'Mensual', biweekly: 'Quincenal', weekly: 'Semanal', once: 'Única vez' };
const ACCOUNT_TYPE_LABELS = { corriente: 'Cta. Corriente', vista: 'Cta. Vista / RUT', ahorro: 'Cta. de Ahorro', chequera_electronica: 'Chequera Electrónica' };

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
  const [confirmAction, setConfirmAction] = useState(null); // null | 'close' | 'delete'
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessMsg, setAccessMsg] = useState('');

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
  const onTimeCount = participants.filter(p => p.contributionStatus === 'onTime').length;
  const hasOverdue = participants.some(p => p.contributionStatus === 'overdue');
  const myParticipant = participants.find(p => p.user?._id?.toString() === user?._id?.toString());
  const isPendingInvitee = myParticipant?.status === 'pending' && myParticipant?.hasInvitation;

  async function handleAcceptInvitation() {
    setAcceptingInvite(true);
    try {
      await acceptMyInvitation(id);
      const { data } = await getParticipants(id);
      setParticipants(data);
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'Error al aceptar la invitación');
    } finally {
      setAcceptingInvite(false);
    }
  }

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

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // \uFEFF: BOM UTF-8 para compatibilidad con Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fondo_${fund.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function runFundAction(apiFn, errorMsg) {
    setActionLoading(true);
    try {
      const res = await apiFn();
      setFund(prev => ({ ...prev, status: res.data.status }));
    } catch (err) {
      window.alert(err.response?.data?.error ?? errorMsg);
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

  const canRequestPublicAccess =
    user &&
    !isMember &&
    !isPendingInvitee &&
    fund?.visibility === 'public' &&
    fund?.status === 'active' &&
    new Date(fund.deadline) > new Date();

  async function handleRequestAccess() {
    if (!canRequestPublicAccess) return;
    setAccessLoading(true);
    setAccessMsg('');
    try {
      await requestFundAccess(id);
      setAccessMsg('Te enviamos la solicitud al organizador por correo.');
    } catch (err) {
      setAccessMsg(err.response?.data?.error ?? 'No se pudo enviar la solicitud');
    } finally {
      setAccessLoading(false);
    }
  }

  async function handleRemoveParticipant(userId) {
    if (!isOrganizer) return;
    if (!window.confirm('¿Eliminar participante? Solo se puede si no ha realizado aportes.')) return;
    setRemovingId(userId);
    try {
      await removeParticipant(id, userId);
      setParticipants(prev => prev.filter(p => p.user?._id?.toString() !== userId));
    } catch (err) {
      window.alert(err.response?.data?.error ?? 'Error al eliminar participante');
    } finally {
      setRemovingId('');
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/fondos" className="text-gray-400 hover:text-gray-600 text-sm">← Mis fondos</Link>
      </div>

      {/* Banners de estado */}
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

      {/* Resumen del fondo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{fund.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Organizado por {fmtName(fund.organizer?.name)}</p>
          </div>
          <StatusBadge status={fund.status} />
        </div>

        {fund.description && (
          <p className="text-sm text-gray-600 mt-2">{fund.description}</p>
        )}
        {fund.goal && (
          <p className="text-xs text-gray-400 mt-1">
            <span className="font-medium text-gray-500">Objetivo: </span>{fund.goal}
          </p>
        )}

        <div className="mt-4">
          <ProgressBar value={collectedAmount} max={fund.targetAmount} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 text-sm text-gray-600">
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Fecha límite</span>
            {fmtDate(fund.deadline)}
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Tipo</span>
            {fund.type === 'quota'
              ? `Por cuotas (${fund.quotaAmount?.toLocaleString('es-CL')} CLP, ${FREQ_LABELS[fund.frequency] ?? 'Única vez'})`
              : 'Libre'}
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Participantes</span>
            {accepted.length + 1}
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Visibilidad</span>
            {fund.visibility === 'public' ? 'Público' : 'Privado'}
          </div>
          {fund.type === 'free' && fund.minAmount > 0 && (
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Monto mínimo</span>
              {fund.minAmount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
            </div>
          )}
          {isOrganizer && fund.recipientAccount && (
            <div className="col-span-2">
              <span className="text-xs text-gray-400 block mb-0.5">Cuenta destinataria</span>
              <p className="text-sm text-gray-800 font-medium">{fund.recipientAccount.bank}</p>
              <p className="text-xs text-gray-500">
                {ACCOUNT_TYPE_LABELS[fund.recipientAccount.accountType]}
              </p>
              <p className="text-xs text-gray-500">{fund.recipientAccount.accountNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Registro de actualizaciones */}
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

      {/* Participantes */}
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
          contributions={contributions}
          isOrganizer={isOrganizer}
          onRemove={handleRemoveParticipant}
          removingId={removingId}
          emptyMessage="No hay participantes aún."
        />
      </div>

      {/* Resumen de estado de participantes */}
      {accepted.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-3 mb-4 text-sm text-gray-600">
          {`${onTimeCount} de ${accepted.length + 1} participante${accepted.length + 1 !== 1 ? 's' : ''} al día`}
        </div>
      )}

      {/* Historial de aportes */}
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
              onCreated={(c, options) => {
                setContributions(prev => [
                  { ...c, user: { _id: user._id, name: user.name, email: user.email } },
                  ...prev,
                ]);
                if (!options?.keepOpen) {
                  setShowContribForm(false);
                }
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

      {/* Acciones utilitarias */}
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

      {isPendingInvitee && fund.status === 'active' && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm rounded-lg px-4 py-3 mb-4">
          <p className="mb-2 font-medium">Tienes una invitación pendiente para unirte a este fondo.</p>
          <button
            onClick={handleAcceptInvitation}
            disabled={acceptingInvite}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {acceptingInvite ? 'Aceptando…' : 'Aceptar invitación'}
          </button>
        </div>
      )}

      {!isMember && fund.visibility === 'public' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3 mb-4 space-y-2">
          {canRequestPublicAccess ? (
            <>
              <p>¿Quieres participar en este fondo público? El organizador recibirá un correo para aceptar o rechazar tu solicitud.</p>
              <button
                type="button"
                onClick={handleRequestAccess}
                disabled={accessLoading}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {accessLoading ? 'Enviando…' : 'Solicitar acceso'}
              </button>
              {accessMsg && <p className="text-xs text-blue-800">{accessMsg}</p>}
            </>
          ) : (
            <p>
              {fund.status !== 'active' || new Date(fund.deadline) <= new Date()
                ? 'Este fondo público ya no admite nuevas solicitudes de acceso.'
                : 'Estás visitando este fondo público.'}
            </p>
          )}
        </div>
      )}
      {/* Acciones del organizador */}
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
              {fund.status === 'active' && hasOverdue && (
                <button
                  onClick={async () => {
                    try {
                      const res = await sendReminders(id, 'overdue');
                      setReminderMsg(`Alerta enviada a ${res.data.sent} participante${res.data.sent !== 1 ? 's' : ''} en mora.`);
                      setTimeout(() => setReminderMsg(''), 4000);
                    } catch {
                      setReminderMsg('Error al enviar alertas');
                    }
                  }}
                  className="bg-white border border-red-200 hover:border-red-400 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Alertar en mora
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
                  onClick={() => setConfirmAction('close')}
                  disabled={actionLoading}
                  className="bg-white border border-amber-300 hover:border-amber-400 text-amber-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cerrar fondo
                </button>
              )}
              {fund.status === 'active' && collectedAmount === 0 && (
                <button
                  onClick={() => setConfirmAction('delete')}
                  disabled={actionLoading}
                  className="bg-white border border-red-200 hover:border-red-400 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Eliminar fondo
                </button>
              )}
              {fund.status === 'active' && (
                <button
                  onClick={() => runFundAction(() => pauseFund(id), 'Error al pausar')}
                  disabled={actionLoading}
                  className="bg-white border border-yellow-300 hover:border-yellow-400 text-yellow-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Pausar fondo
                </button>
              )}
              {fund.status === 'paused' && (
                <button
                  onClick={() => runFundAction(() => resumeFund(id), 'Error al reanudar')}
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
          onUpdateParticipants={updated => setParticipants(updated)}
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
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === 'close') runFundAction(() => closeFund(id), 'Error al cerrar');
          if (action === 'delete') executeDelete();
        }}
        title={confirmAction === 'delete' ? 'Eliminar fondo' : 'Cerrar fondo'}
        message={
          confirmAction === 'delete'
            ? '¿Estás seguro de que deseas eliminar este fondo? Esta acción no se puede deshacer y se borrarán todos los datos asociados.'
            : '¿Estás seguro de que deseas cerrar este fondo? Ya no se podrán recibir aportes nuevos.'
        }
        requireKeyword={true}
        keyword={confirmAction === 'delete' ? 'ELIMINAR' : 'CERRAR'}
      />
    </div>
  );
}
