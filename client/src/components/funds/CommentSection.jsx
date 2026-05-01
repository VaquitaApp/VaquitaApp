import { useState } from 'react';
import { postMessage } from '../../api/funds';
import { fmtName } from '../../utils/format';

export default function CommentSection({ fundId, messages = [], onMessageAdded, isMember }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const res = await postMessage(fundId, { text });
      onMessageAdded(res.data);
      setText('');
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al enviar el mensaje');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
      <h2 className="font-semibold text-gray-800 text-sm mb-4">Comentarios del fondo</h2>
      
      <div className="space-y-4 max-h-64 overflow-y-auto mb-4 pr-2">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No hay mensajes aún. ¡Sé el primero en comentar!</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-700">{fmtName(msg.user?.name)}</span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleDateString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-gray-600">{msg.text}</p>
            </div>
          ))
        )}
      </div>

      {isMember ? (
        <form onSubmit={handleSubmit} className="mt-4">
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Escribe un comentario corto (ej: ¡Transferido!)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              maxLength={150}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-gray-400 mt-2 text-center bg-gray-50 p-2 rounded">
          Solo los participantes pueden escribir comentarios.
        </p>
      )}
    </div>
  );
}
