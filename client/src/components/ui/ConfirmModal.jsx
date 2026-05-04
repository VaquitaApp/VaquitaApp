import { useState } from 'react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, requireKeyword, keyword }) {
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireKeyword && input !== keyword) return;
    onConfirm();
    setInput('');
  };

  const handleClose = () => {
    setInput('');
    onClose();
  };

  const isValid = !requireKeyword || input === keyword;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--vaq-modal-backdrop)' }}
    >
      <div className="vaq-card max-h-[90vh] w-full max-w-md overflow-hidden shadow-xl">
        <div className="border-b border-[var(--vaq-card-border)] px-6 py-4">
          <h3 className="text-lg font-bold text-[var(--vaq-ink)]">{title}</h3>
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm text-[var(--vaq-muted)]">{message}</p>

          {requireKeyword && (
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--vaq-ink)]">
                Para confirmar, escribe{' '}
                <span className="rounded bg-[var(--vaq-well-bg)] px-1 font-bold select-all">{keyword}</span>
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="vaq-input mt-1 border-[var(--vaq-danger)]/40 focus:ring-[var(--vaq-danger)]"
                placeholder={keyword}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 rounded-b-xl border-t border-[var(--vaq-card-border)] bg-[var(--vaq-well-bg)] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="vaq-btn-secondary text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            className="rounded-lg bg-[var(--vaq-danger)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
