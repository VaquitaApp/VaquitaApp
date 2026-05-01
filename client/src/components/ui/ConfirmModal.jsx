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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">{message}</p>
          
          {requireKeyword && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Para confirmar, escribe <span className="font-bold select-all bg-gray-100 px-1 rounded">{keyword}</span>
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={keyword}
                autoFocus
              />
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
