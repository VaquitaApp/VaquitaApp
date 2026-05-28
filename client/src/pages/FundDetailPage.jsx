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
import MilestonesTimeline from '../components/funds/MilestonesTimeline';
import FundChart from '../components/funds/FundChart';
import CommentSection from '../components/funds/CommentSection';
import ConfirmModal from '../components/ui/ConfirmModal';

import { fmtDate, fmtName } from '../utils/format';
import { ACCOUNT_TYPE_LABELS } from '../constants/accountTypes';
import { freqLabelCap } from '../constants/frequencies';

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

  if (loading) return <p className="text-sm text-[var(--vaq-muted)]">Cargando…</p>;
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
      setAccessMsg('Hemos enviado la solicitud al organizador via correo.');
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
        <Link to="/fondos" className="text-sm text-[var(--vaq-muted)] transition-colors hover:text-[var(--vaq-ink)]">
          ← Mis fondos
        </Link>
      </div>

      {/* Banners de estado */}
      {fund.status === 'completed' && (
        <div className="mb-4 rounded-lg border border-[var(--vaq-callout-info-border)] bg-[var(--vaq-callout-info-bg)] px-4 py-3 text-sm text-[var(--vaq-callout-info-text)]">
          Este fondo ha sido completado. Los fondos fueron transferidos al destinatario.
        </div>
      )}
      {fund.status === 'closed' && (
        <div className="mb-4 rounded-lg border border-[var(--vaq-callout-neutral-border)] bg-[var(--vaq-callout-neutral-bg)] px-4 py-3 text-sm text-[var(--vaq-callout-neutral-text)]">
          Este fondo fue cerrado por el organizador.
        </div>
      )}
      {fund.status === 'paused' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3 mb-4">
          Este fondo se encuentra pausado por el organizador. No se reciben aportes temporalmente.
        </div>
      )}

      {/* Resumen del fondo */}
      <div className="vaq-card p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--vaq-ink)]">{fund.name}</h1>
            <p className="mt-0.5 text-sm text-[var(--vaq-muted)]">Organizado por {fmtName(fund.organizer?.name)}</p>
          </div>
          <StatusBadge status={fund.status} />
        </div>

        {fund.description && (
          <p className="mt-2 text-sm text-[var(--vaq-muted)]">{fund.description}</p>
        )}
        {fund.goal && (
          <p className="mt-1 text-xs text-[var(--vaq-muted)]">
            <span className="font-medium text-[var(--vaq-ink)]">Objetivo: </span>{fund.goal}
          </p>
        )}

        <div className="mt-4">
          <ProgressBar value={collectedAmount} max={fund.targetAmount} milestones={fund.milestones} />
        </div>

        <MilestonesTimeline milestones={fund.milestones} currentAmount={collectedAmount} />

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-[var(--vaq-muted)]">
          <div>
            <span className="mb-0.5 block text-xs text-[var(--vaq-muted)]">Fecha límite</span>
            {fmtDate(fund.deadline)}
          </div>
          <div>
            <span className="text-xs text-[var(--vaq-muted)] block mb-0.5">Tipo</span>
            {fund.type === 'quota'
              ? `Por cuotas (${fund.quotaAmount?.toLocaleString('es-CL')} CLP, ${freqLabelCap(fund.frequency)})`
              : 'Libre'}
          </div>
          <div>
            <span className="text-xs text-[var(--vaq-muted)] block mb-0.5">Participantes</span>
            {accepted.length + 1}
          </div>
          <div>
            <span className="text-xs text-[var(--vaq-muted)] block mb-0.5">Visibilidad</span>
            {fund.visibility === 'public' ? 'Público' : 'Privado'}
          </div>
          {fund.type === 'free' && fund.minAmount > 0 && (
            <div>
              <span className="text-xs text-[var(--vaq-muted)] block mb-0.5">Monto mínimo</span>
              {fund.minAmount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
            </div>
          )}
          {isOrganizer && fund.recipientAccount && (
            <div className="col-span-2">
              <span className="text-xs text-[var(--vaq-muted)] block mb-0.5">Cuenta destinataria</span>
              <p className="text-sm font-medium text-[var(--vaq-ink)]">{fund.recipientAccount.bank}</p>
              <p className="text-xs text-[var(--vaq-muted)]">
                {ACCOUNT_TYPE_LABELS[fund.recipientAccount.accountType]}
              </p>
              <p className="text-xs text-[var(--vaq-muted)]">{fund.recipientAccount.accountNumber}</p>
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
      <div className="vaq-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--vaq-ink)]">Participantes</h2>
          {isOrganizer && fund.status === 'active' && (
            <button
              onClick={() => setShowInvite(true)}
              className="vaq-btn-primary rounded-md px-3 py-1.5 text-xs transition-opacity hover:opacity-95"
            >
              + Invitar
            </button>
          )}
        </div>
        <ParticipantList
          fund={fund}
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
        <div className="vaq-card px-6 py-3 mb-4 text-sm text-[var(--vaq-muted)]">
          {`${onTimeCount} de ${accepted.length + 1} participante${accepted.length + 1 !== 1 ? 's' : ''} al día`}
        </div>
      )}

      {/* Historial de aportes */}
      <div className="vaq-card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--vaq-ink)]">Historial de aportes</h2>
          {isMember && fund.status === 'active' && !showContribForm && (
            <button
              onClick={() => setShowContribForm(true)}
              className="vaq-btn-primary rounded-md px-3 py-1.5 text-xs transition-opacity hover:opacity-95"
            >
              + Realizar aporte
            </button>
          )}
        </div>
        {showContribForm && (
          <div className="mb-4 rounded-lg border border-[var(--vaq-card-border)] p-4">
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
            <p className="mb-2 text-xs text-[var(--vaq-muted)]">Aportes en el tiempo</p>
            <FundChart contributions={contributions} deadline={fund.deadline} />
          </div>
        )}
      </div>

      {/* Acciones utilitarias */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleCopyLink}
          className="vaq-btn-secondary rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--vaq-ring)]"
        >
          Copiar enlace
        </button>
        {(isOrganizer || isMember) && (
          <button
            onClick={handleDownloadCSV}
            className="vaq-btn-secondary rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--vaq-ring)]"
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
        <div className="mb-4 rounded-lg border border-[var(--vaq-callout-info-border)] bg-[var(--vaq-callout-info-bg)] px-4 py-3 text-sm text-[var(--vaq-callout-info-text)]">
          <p className="mb-2 font-medium">Tienes una invitación pendiente para unirte a este fondo.</p>
          <button
            onClick={handleAcceptInvitation}
            disabled={acceptingInvite}
            className="vaq-btn-primary rounded-md px-4 py-1.5 text-sm transition-opacity disabled:opacity-50"
          >
            {acceptingInvite ? 'Aceptando…' : 'Aceptar invitación'}
          </button>
        </div>
      )}

      {!isMember && fund.visibility === 'public' && (
        <div className="mb-4 space-y-2 rounded-lg border border-[var(--vaq-callout-info-border)] bg-[var(--vaq-callout-info-bg)] px-4 py-3 text-sm text-[var(--vaq-callout-info-text)]">
          {canRequestPublicAccess ? (
            <>
              <p>¿Quieres participar en este fondo público? El organizador recibirá un correo para aceptar o rechazar tu solicitud.</p>
              <button
                type="button"
                onClick={handleRequestAccess}
                disabled={accessLoading}
                className="vaq-btn-primary rounded-md px-3 py-1.5 text-xs transition-opacity disabled:opacity-50"
              >
                {accessLoading ? 'Enviando…' : 'Solicitar acceso'}
              </button>
              {accessMsg && <p className="text-xs text-[var(--vaq-callout-info-text)] opacity-90">{accessMsg}</p>}
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
            <p className="mb-1 w-full rounded border border-[var(--vaq-tone-success-text)]/25 bg-[var(--vaq-tone-success-bg)] px-3 py-1.5 text-xs text-[var(--vaq-tone-success-text)]">
              {reminderMsg}
            </p>
          )}
          {isOrganizer && (
            <>
              {fund.status === 'active' && hasOverdue && (
                <button
                  onClick={async () => {
                    try {
                      const res = await sendReminders(id);
                      setReminderMsg(`Alerta enviada a ${res.data.sent} participante${res.data.sent !== 1 ? 's' : ''} en mora.`);
                      setTimeout(() => setReminderMsg(''), 4000);
                    } catch {
                      setReminderMsg('Error al enviar alertas');
                    }
                  }}
                  className="vaq-btn-secondary rounded-lg border-[var(--vaq-danger)]/35 px-4 py-2 text-sm font-medium text-[var(--vaq-danger)] transition-colors hover:border-[var(--vaq-danger)]"
                >
                  Alertar morosos
                </button>
              )}
              {fund.status === 'active' && (
                <Link
                  to={`/fondos/${id}/editar`}
                  className="vaq-btn-secondary inline-flex rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--vaq-ring)]"
                >
                  Editar fondo
                </Link>
              )}
              {fund.status === 'active' && collectedAmount > 0 && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="vaq-btn-primary rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-95"
                >
                  Pagar al destinatario
                </button>
              )}
              {fund.status === 'active' && collectedAmount === 0 && (
                <button
                  onClick={() => setConfirmAction('close')}
                  disabled={actionLoading}
                  className="vaq-btn-secondary rounded-lg border-[var(--vaq-amber)]/50 px-4 py-2 text-sm font-medium text-[var(--vaq-amber)] transition-colors hover:border-[var(--vaq-amber)] disabled:opacity-50"
                >
                  Cerrar fondo
                </button>
              )}
              {fund.status === 'active' && collectedAmount === 0 && (
                <button
                  onClick={() => setConfirmAction('delete')}
                  disabled={actionLoading}
                  className="vaq-btn-secondary rounded-lg border-[var(--vaq-danger)]/35 px-4 py-2 text-sm font-medium text-[var(--vaq-danger)] transition-colors hover:border-[var(--vaq-danger)] disabled:opacity-50"
                >
                  Eliminar fondo
                </button>
              )}
              {fund.status === 'active' && (
                <button
                  onClick={() => runFundAction(() => pauseFund(id), 'Error al pausar')}
                  disabled={actionLoading}
                  className="vaq-btn-secondary rounded-lg border-[var(--vaq-tone-warning-text)]/40 px-4 py-2 text-sm font-medium text-[var(--vaq-tone-warning-text)] transition-colors hover:border-[var(--vaq-tone-warning-text)] disabled:opacity-50"
                >
                  Pausar fondo
                </button>
              )}
              {fund.status === 'paused' && (
                <button
                  onClick={() => runFundAction(() => resumeFund(id), 'Error al reanudar')}
                  disabled={actionLoading}
                  className="vaq-btn-secondary rounded-lg border-[var(--vaq-tone-success-text)]/40 px-4 py-2 text-sm font-medium text-[var(--vaq-tone-success-text)] transition-colors hover:border-[var(--vaq-tone-success-text)] disabled:opacity-50"
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
