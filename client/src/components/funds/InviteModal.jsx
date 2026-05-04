import { useState, useEffect, useRef } from 'react';
import { searchUsers, inviteUser, cancelInvitation } from '../../api/participants';
import { InvitationBadge } from '../ui/Badge';
import { fmtName } from '../../utils/format';

const inputClass =
  'mb-3 w-full rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-2 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

export default function InviteModal({
  fundId,
  existingParticipants = [],
  onClose,
  onInvited,
  onUpdateParticipants,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(null);
  const [canceling, setCanceling] = useState(null);
  const [error, setError] = useState('');
  const debounce = useRef(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (query.length < 2) {
      const t0 = setTimeout(() => setResults([]), 0);
      return () => {
        clearTimeout(t0);
        clearTimeout(debounce.current);
      };
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchUsers(query);
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  function getExisting(userId) {
    const id = userId?.toString();
    return existingParticipants.find((p) => (p.user?._id ?? p.user)?.toString() === id);
  }

  const invited = existingParticipants.filter((p) => p.status !== 'accepted');

  async function handleInvite(userId) {
    setInviting(userId);
    setError('');
    try {
      const res = await inviteUser(fundId, userId);
      if (res.status === 200) {
        onUpdateParticipants?.(res.data);
      } else {
        onInvited(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al invitar');
    } finally {
      setInviting(null);
    }
  }

  async function handleCancelInvitation(userId) {
    setCanceling(userId);
    setError('');
    try {
      const res = await cancelInvitation(fundId, userId);
      onUpdateParticipants?.(res.data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al cancelar invitacion');
    } finally {
      setCanceling(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--vaq-modal-backdrop)' }}>
      <div className="vaq-card mx-4 w-full max-w-md p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--vaq-ink)]">Invitar participante</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[var(--vaq-muted)] transition-colors hover:text-[var(--vaq-ink)]"
          >
            &times;
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre o email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className={inputClass}
        />

        {loading && <p className="text-xs text-[var(--vaq-muted)]">Buscando…</p>}
        {error && <p className="mb-2 text-xs text-[var(--vaq-danger)]">{error}</p>}

        <ul className="max-h-52 space-y-1 overflow-y-auto">
          {results.map((u) => {
            const existing = getExisting(u._id);
            return (
              <li
                key={u._id}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--vaq-well-bg)]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--vaq-ink)]">{fmtName(u.name)}</p>
                  <p className="text-xs text-[var(--vaq-muted)]">{u.email}</p>
                </div>
                {!existing ? (
                  <button
                    type="button"
                    onClick={() => handleInvite(u._id)}
                    disabled={inviting === u._id}
                    className="vaq-btn-primary rounded-md px-3 py-1 text-xs disabled:opacity-50"
                  >
                    {inviting === u._id ? '…' : 'Invitar'}
                  </button>
                ) : existing.status === 'accepted' ? (
                  <span className="text-xs italic text-[var(--vaq-muted)]">Ya participa</span>
                ) : existing.status === 'pending' ? (
                  <span className="text-xs italic text-[var(--vaq-muted)]">Invitación pendiente</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInvite(u._id)}
                    disabled={inviting === u._id}
                    className="vaq-btn-secondary rounded-md border-[var(--vaq-forest)]/35 px-3 py-1 text-xs text-[var(--vaq-forest)] disabled:opacity-50"
                  >
                    {inviting === u._id ? '…' : 'Reinvitar'}
                  </button>
                )}
              </li>
            );
          })}
          {!loading && query.length >= 2 && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--vaq-muted)]">No se encontraron usuarios</li>
          )}
        </ul>

        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--vaq-muted)]">Invitados</h3>
          {invited.length === 0 ? (
            <p className="text-xs text-[var(--vaq-muted)]">No hay invitaciones pendientes.</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {invited.map((p) => (
                <li key={p._id} className="flex items-center justify-between rounded-lg bg-[var(--vaq-well-bg)] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--vaq-ink)]">{fmtName(p.user?.name)}</p>
                    <p className="text-xs text-[var(--vaq-muted)]">{p.user?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <InvitationBadge status={p.status} />
                    {p.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleInvite(p.user?._id?.toString())}
                          disabled={inviting === p.user?._id?.toString()}
                          className="text-xs font-semibold text-[var(--vaq-forest)] underline disabled:opacity-50"
                        >
                          {inviting === p.user?._id?.toString() ? 'Reenviando…' : 'Reenviar invitación'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(p.user?._id?.toString())}
                          disabled={canceling === p.user?._id?.toString()}
                          className="text-xs text-[var(--vaq-muted)] underline hover:text-[var(--vaq-ink)] disabled:opacity-50"
                        >
                          {canceling === p.user?._id?.toString() ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      </>
                    )}
                    {p.status === 'rejected' && (
                      <button
                        type="button"
                        onClick={() => handleInvite(p.user?._id?.toString())}
                        disabled={inviting === p.user?._id?.toString()}
                        className="text-xs font-semibold text-[var(--vaq-forest)] underline disabled:opacity-50"
                      >
                        {inviting === p.user?._id?.toString() ? 'Reinvitando…' : 'Reinvitar'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
