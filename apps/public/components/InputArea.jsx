import { useState, useRef } from 'react';
import { Paperclip, Send, X } from 'lucide-react';

export default function InputArea({ onSend, onFileUpload, uploadProgress, uploading }) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !uploading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // FIRST: Validate file size BEFORE anything else - this prevents any backend call
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isImage = file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.heic'].includes(fileExtension);
    const maxSizeBytes = isImage ? 1 * 1024 * 1024 : 10 * 1024 * 1024; // 1MB for images, 10MB for others
    const maxSizeMB = isImage ? 1 : 10;
    
    // Strict validation: file must be LESS than maxSize (not equal to)
    if (file.size >= maxSizeBytes) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const errorMsg = `File size limit exceeded. Your file is ${fileSizeMB}MB, but the maximum is ${maxSizeMB}MB for ${isImage ? 'images' : 'documents'}.`;
      if (window.toast) {
        window.toast.error(errorMsg);
      } else {
        alert(errorMsg);
      }
      e.target.value = '';
      return; // STOP HERE - don't proceed to backend
    }
    
    // SECOND: Validate file type
    const validExtensions = ['.pdf', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.heic'];
    
    if (!validExtensions.includes(fileExtension)) {
      // Use toast if available, otherwise alert
      if (window.toast) {
        window.toast.error('Please upload PDF, TXT, CSV, or image files (PNG, JPG, JPEG, HEIC)');
      } else {
        alert('Please upload PDF, TXT, CSV, or image files (PNG, JPG, JPEG, HEIC)');
      }
      e.target.value = '';
      return;
    }
    
    onFileUpload(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="bg-background">
      {uploadProgress !== null && uploadProgress < 100 && (
        <div className="px-3 sm:px-6 py-2">
          <div className="h-1 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full gradient-accent transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 sm:p-3 rounded-lg hover:bg-surface/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary hover:text-text-primary flex-shrink-0"
            aria-label="Upload file"
          >
            <Paperclip size={18} className="sm:w-5 sm:h-5" />
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.heic"
            className="hidden"
          />
          
          <div className="flex-1 relative min-w-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              disabled={uploading}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 rounded-xl bg-surface border border-border/50 text-text-primary placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto text-sm sm:text-base"
              style={{
                minHeight: '44px',
                height: 'auto',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || uploading}
            className="p-2 sm:p-3 rounded-xl gradient-accent text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

