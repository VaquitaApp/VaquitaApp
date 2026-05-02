import { useState, useEffect, useRef } from 'react';
import { searchUsers, inviteUser, cancelInvitation } from '../../api/participants';
import { InvitationBadge } from '../ui/Badge';
import { fmtName } from '../../utils/format';

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
    if (query.length < 2) { setResults([]); return; }
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
  }, [query]);

  function getExisting(userId) {
    const id = userId?.toString();
    return existingParticipants.find(p => (p.user?._id ?? p.user)?.toString() === id);
  }

  const invited = existingParticipants.filter(p => p.status !== 'accepted');

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Invitar participante</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre o email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
        />

        {loading && <p className="text-xs text-gray-400">Buscando…</p>}
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        <ul className="space-y-1 max-h-52 overflow-y-auto">
          {results.map(u => {
            const existing = getExisting(u._id);
            return (
              <li key={u._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{fmtName(u.name)}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                {!existing ? (
                  <button
                    onClick={() => handleInvite(u._id)}
                    disabled={inviting === u._id}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md disabled:opacity-50"
                  >
                    {inviting === u._id ? '…' : 'Invitar'}
                  </button>
                ) : existing.status === 'accepted' ? (
                  <span className="text-xs text-gray-400 italic">Ya participa</span>
                ) : existing.status === 'pending' ? (
                  <span className="text-xs text-gray-400 italic">Invitación pendiente</span>
                ) : (
                  <button
                    onClick={() => handleInvite(u._id)}
                    disabled={inviting === u._id}
                    className="text-xs border border-indigo-300 text-indigo-700 hover:border-indigo-400 px-3 py-1 rounded-md disabled:opacity-50"
                  >
                    {inviting === u._id ? '…' : 'Reinvitar'}
                  </button>
                )}
              </li>
            );
          })}
          {!loading && query.length >= 2 && results.length === 0 && (
            <li className="text-xs text-gray-400 px-3 py-2">No se encontraron usuarios</li>
          )}
        </ul>

        <div className="mt-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invitados</h3>
          {invited.length === 0 ? (
            <p className="text-xs text-gray-400">No hay invitaciones pendientes.</p>
          ) : (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {invited.map(p => (
                <li key={p._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{fmtName(p.user?.name)}</p>
                    <p className="text-xs text-gray-400">{p.user?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <InvitationBadge status={p.status} />
                    {p.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleInvite(p.user?._id?.toString())}
                          disabled={inviting === p.user?._id?.toString()}
                          className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                        >
                          {inviting === p.user?._id?.toString() ? 'Reenviando…' : 'Reenviar invitación'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(p.user?._id?.toString())}
                          disabled={canceling === p.user?._id?.toString()}
                          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
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
                        className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
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
