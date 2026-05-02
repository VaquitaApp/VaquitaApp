import { useState, useEffect, useRef } from 'react';
import { searchUsers, inviteUser } from '../../api/participants';
import { fmtName } from '../../utils/format';

export default function InviteModal({ fundId, existingParticipants = [], onClose, onInvited }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(null);
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

  function isAlreadyAccepted(userId) {
    return existingParticipants.some(p =>
      (p.user?._id === userId || p.user === userId) && p.status === 'accepted'
    );
  }

  async function handleInvite(userId) {
    setInviting(userId);
    setError('');
    try {
      const res = await inviteUser(fundId, userId);
      onInvited(res.data);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al invitar');
    } finally {
      setInviting(null);
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

        <ul className="space-y-1 max-h-60 overflow-y-auto">
          {results.map(u => {
            const accepted = isAlreadyAccepted(u._id);
            return (
              <li key={u._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{fmtName(u.name)}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                {accepted ? (
                  <span className="text-xs text-gray-400 italic">Ya participante</span>
                ) : (
                  <button
                    onClick={() => handleInvite(u._id)}
                    disabled={inviting === u._id}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md disabled:opacity-50"
                  >
                    {inviting === u._id ? '…' : 'Invitar'}
                  </button>
                )}
              </li>
            );
          })}
          {!loading && query.length >= 2 && results.length === 0 && (
            <li className="text-xs text-gray-400 px-3 py-2">No se encontraron usuarios</li>
          )}
        </ul>
      </div>
    </div>
  );
}
