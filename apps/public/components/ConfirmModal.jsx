import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  variant = 'default' // 'default', 'danger'
}) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl w-[90%] max-w-[420px] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon and Title */}
        <div className="flex items-start gap-4 mb-4">
          {isDanger && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-100 mb-1">
              {title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-transparent border-none text-slate-400 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 text-sm font-medium cursor-pointer transition-all hover:bg-slate-700 hover:border-slate-500"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium cursor-pointer transition-all ${
              isDanger
                ? 'bg-red-600 border border-red-500 hover:bg-red-700 hover:border-red-600'
                : 'bg-indigo-600 border border-indigo-500 hover:bg-indigo-700 hover:border-indigo-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

