import { useState, useRef } from 'react';
import { X, FileText, Trash2, Upload, Link as LinkIcon, BarChart2, Image } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { api } from '../utils/api';

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
  onDocumentAdded,
  userId,
}) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [linkUrl, setLinkUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file);
    }
    e.target.value = '';
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addLink(linkUrl, userId);
      toast.success('Link added successfully!');
      setLinkUrl('');
      if (onDocumentAdded) {
        onDocumentAdded();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add link');
      console.error('Link submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      toast.error('Please enter some text');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.addText(textTitle || 'Untitled note', textContent, userId);
      toast.success('Text saved successfully!');
      setTextContent('');
      setTextTitle('');
      if (onDocumentAdded) {
        onDocumentAdded();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save text');
      console.error('Text submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 sm:top-16 h-screen sm:h-[calc(100vh-4rem)] w-full sm:w-96 bg-surface border-l border-border/50 z-50 animate-slide-in overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-text-primary">Add Content</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-background/50 transition-colors text-text-secondary hover:text-text-primary"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-4 border-b border-border/50">
          <button
            className={`flex-1 px-3 py-2.5 rounded-t-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-surface text-text-primary border-t border-l border-r border-border/50'
                : 'text-text-secondary hover:text-text-primary hover:bg-background/30'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <button
            className={`flex-1 px-3 py-2.5 rounded-t-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'link'
                ? 'bg-surface text-text-primary border-t border-l border-r border-border/50'
                : 'text-text-secondary hover:text-text-primary hover:bg-background/30'
            }`}
            onClick={() => setActiveTab('link')}
          >
            <LinkIcon size={16} />
            <span className="hidden sm:inline">Link</span>
          </button>
          <button
            className={`flex-1 px-3 py-2.5 rounded-t-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'text'
                ? 'bg-surface text-text-primary border-t border-l border-r border-border/50'
                : 'text-text-secondary hover:text-text-primary hover:bg-background/30'
            }`}
            onClick={() => setActiveTab('text')}
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Text</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              <p className="text-sm text-text-secondary mb-4">
                {documents.length} / 50 documents
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={documents.length >= 50}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg gradient-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                <Upload size={18} />
                <span>Upload Document</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.heic"
                className="hidden"
              />
              {uploadProgress !== null && (
                <div className="mb-4 p-3 bg-background/50 border border-border/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-secondary">Uploading...</span>
                    <span className="text-xs text-text-secondary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full gradient-accent transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Link Tab */}
          {activeTab === 'link' && (
            <div>
              <p className="text-sm text-text-secondary mb-2">
                Add articles, Google Docs, websites, or any public URL
              </p>
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400 font-medium mb-1">⚠️ Important</p>
                <p className="text-xs text-amber-300/80">
                  Links must be publicly accessible. Private pages, password-protected content, or pages requiring authentication cannot be processed.
                </p>
              </div>
              
              <div className="mb-4">
                <input
                  type="url"
                  placeholder="https://example.com/article"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                  disabled={isSubmitting}
                />
              </div>

              <div className="mb-6">
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">
                  Supported sources:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Articles', 'Google Docs', 'Notion', 'GitHub', 'Medium', 'Any website'].map((source) => (
                    <span
                      key={source}
                      className="px-2.5 py-1 bg-background/50 border border-border/30 rounded-full text-xs text-text-secondary"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLinkSubmit}
                disabled={!linkUrl.trim() || isSubmitting || documents.length >= 50}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Link'}
              </button>
            </div>
          )}

          {/* Text Tab */}
          {activeTab === 'text' && (
            <div>
              <p className="text-sm text-text-secondary mb-4">
                Paste email chains, notes, meeting minutes, or any text
              </p>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Title (optional)"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 font-medium"
                  disabled={isSubmitting}
                />
              </div>

              <div className="mb-4">
                <textarea
                  placeholder="Paste your text here...

Examples:
- Email threads
- Meeting notes
- Code snippets
- Research notes
- Brainstorming ideas"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full px-4 py-3 bg-background/50 border border-border/50 rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 font-mono text-sm resize-y min-h-[300px]"
                  rows={15}
                  disabled={isSubmitting}
                />
                <div className="text-xs text-text-secondary text-right mt-2">
                  {textContent.length} characters
                </div>
              </div>

              <button
                onClick={handleTextSubmit}
                disabled={!textContent.trim() || isSubmitting || documents.length >= 50}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Text'}
              </button>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="border-t border-border/50 p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Your Documents ({documents.length}/50)
          </h3>
          {documents.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm mb-2">You haven't uploaded any documents</p>
              <p className="text-xs leading-relaxed">
                I'm your second brain and digital garden, so you can store PDFs, CSVs, and other types of documents, and I can recall anything you need no matter how much you store.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="glass p-4 rounded-lg border border-border/30 hover:border-border/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background/50 flex-shrink-0">
                      {doc.doc_type === 'link' ? (
                        <LinkIcon size={18} className="text-text-secondary" />
                      ) : doc.filename && doc.filename.match(/\.csv$/i) ? (
                        <BarChart2 size={18} className="text-text-secondary" />
                      ) : doc.filename && doc.filename.match(/\.(png|jpg|jpeg|heic)$/i) ? (
                        <Image size={18} className="text-text-secondary" />
                      ) : (
                        <FileText size={18} className="text-text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {doc.source_url && (
                          <span className="truncate block">{doc.source_url}</span>
                        )}
                        {formatFileSize(doc.size_bytes || 0)} •{' '}
                        {formatDistanceToNow(new Date(doc.upload_date * 1000), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => onDelete(doc.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
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

