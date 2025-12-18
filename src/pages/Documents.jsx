import { useState, useRef, useEffect } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Toaster, toast } from 'react-hot-toast';
import MainSidebar from '../components/MainSidebar';
import Settings from '../components/Settings';
import Profile from '../components/Profile';
import Auth from '../components/Auth';
import { api } from '../utils/api';

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function Documents() {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [mainSidebarOpen, setMainSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('sidebarOpen');
    return stored ? JSON.parse(stored) : false;
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Get userId from localStorage
  const userId = localStorage.getItem('userId') || crypto.randomUUID();

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments(userId);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain'];
    const validExtensions = ['.pdf', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast.error('Please upload a PDF or TXT file');
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await api.uploadFile(file, userId);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success(`${file.name} uploaded successfully!`);
      
      // Reload documents
      await loadDocuments();
      
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(null);
        setUploading(false);
      }, 500);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
      setUploadProgress(null);
      setUploading(false);
      console.error('Upload error:', error);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await api.deleteDocument(documentId);
      toast.success('Document deleted');
      await loadDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
      console.error('Delete error:', error);
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleProfileClick = () => {
    if (user) {
      setProfileOpen(true);
    } else {
      setAuthOpen(true);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('user');
    setProfileOpen(false);
    toast.success('Signed out successfully');
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setAuthOpen(false);
    toast.success('Signed in successfully!');
  };

  const handleDeleteAllChats = () => {
    toast.success('All chats deleted');
  };

  const handleDeleteAccount = async () => {
    try {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      toast.success('Account deleted successfully');
      setSettingsOpen(false);
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to delete account');
    }
  };

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(mainSidebarOpen));
  }, [mainSidebarOpen]);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1E293B',
            color: '#F1F5F9',
            border: '1px solid #334155',
          },
        }}
      />

      {/* Main Sidebar */}
      <MainSidebar
        isOpen={mainSidebarOpen}
        onToggle={() => setMainSidebarOpen(!mainSidebarOpen)}
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
        chatHistory={[]}
        currentChatId={null}
        onSelectChat={() => {}}
        onNewChat={() => {}}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-border/50 bg-surface/50 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold text-text-primary">My Documents</h1>
            </div>
          
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                {documents.length} / 50 documents
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={documents.length >= 50 || uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {uploadProgress !== null && (
            <div className="mb-6 p-4 bg-surface border border-border/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-primary">Uploading...</span>
                <span className="text-sm text-text-secondary">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                <div
                  className="h-full gradient-accent transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-20">
              <FileText size={64} className="mx-auto mb-6 opacity-50 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary mb-2">No documents yet</h2>
              <p className="text-text-secondary mb-6">Upload your first document to get started</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 rounded-lg gradient-accent text-white hover:opacity-90 transition-opacity mx-auto"
              >
                <Upload size={18} />
                <span>Upload Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="glass p-5 rounded-lg border border-border/30 hover:border-border/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-background/50 flex-shrink-0">
                      <FileText size={20} className="text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate mb-1">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatFileSize(doc.size_bytes || 0)} •{' '}
                        {formatDistanceToNow(new Date(doc.upload_date * 1000), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Delete document"
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
      </div>

      {/* Modals */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        documents={documents}
        chatHistory={[]}
        onDeleteAllChats={handleDeleteAllChats}
        onDeleteAccount={handleDeleteAccount}
      />
      {user ? (
        <Profile
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={user}
          onSignOut={handleSignOut}
        />
      ) : (
        <Auth
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}

