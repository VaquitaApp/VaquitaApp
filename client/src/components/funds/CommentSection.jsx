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
    <div className="vaq-card mb-4 p-6">
      <h2 className="mb-4 text-sm font-semibold text-[var(--vaq-ink)]">Comentarios del fondo</h2>

      <div className="mb-4 max-h-64 space-y-4 overflow-y-auto pr-2">
        {messages.length === 0 ? (
          <p className="text-sm italic text-[var(--vaq-muted)]">No hay mensajes aún. ¡Sé el primero en comentar!</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="rounded-lg bg-[var(--vaq-well-bg)] p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-[var(--vaq-ink)]">{fmtName(msg.user?.name)}</span>
                <span className="text-xs text-[var(--vaq-muted)]">
                  {new Date(msg.createdAt).toLocaleDateString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[var(--vaq-muted)]">{msg.text}</p>
            </div>
          ))
        )}
      </div>

      {isMember ? (
        <form onSubmit={handleSubmit} className="mt-4">
          {error && <p className="mb-2 text-xs text-[var(--vaq-danger)]">{error}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un comentario corto (ej: ¡Transferido!)"
              className="vaq-input flex-1 rounded-lg py-2"
              maxLength={150}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="vaq-btn-primary shrink-0 rounded-lg px-4 py-2 text-sm transition-opacity disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-2 rounded bg-[var(--vaq-well-bg)] p-2 text-center text-xs text-[var(--vaq-muted)]">
          Solo los participantes pueden escribir comentarios.
        </p>
      )}
    </div>
  );
}
