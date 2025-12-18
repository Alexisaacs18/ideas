import { useRef } from 'react';
import { X, FileText, Trash2, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function DocumentsSidebar({
  isOpen,
  onClose,
  documents,
  onDelete,
  onUpload,
  uploadProgress,
}) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file);
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-full sm:w-96 bg-surface border-l border-border/50 z-40 animate-slide-in overflow-y-auto">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">My Documents</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-background/50 transition-colors text-text-secondary hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-text-secondary mb-2">
              {documents.length} / 50 documents
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={documents.length >= 50}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg gradient-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={18} />
              <span>Upload Document</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.txt"
              className="hidden"
            />
          </div>
        </div>

        <div className="p-4">
          {documents.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No documents yet</p>
              <p className="text-sm mt-2">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="glass p-4 rounded-lg border border-border/30 hover:border-border/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background/50">
                      <FileText size={18} className="text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {formatFileSize(doc.size_bytes || 0)} •{' '}
                        {formatDistanceToNow(new Date(doc.upload_date * 1000), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => onDelete(doc.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

