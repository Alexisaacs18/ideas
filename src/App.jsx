import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import TopNav from './components/TopNav';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import DocumentsSidebar from './components/DocumentsSidebar';
import { api } from './utils/api';

function App() {
  const [userId, setUserId] = useState(() => {
    // Get or create user ID from localStorage
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
    
    // Generate a temporary user ID (in production, use proper auth)
    const tempId = crypto.randomUUID();
    localStorage.setItem('userId', tempId);
    return tempId;
  });

  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Register user and load documents on mount
  useEffect(() => {
    registerUser();
  }, [userId]);

  const registerUser = async () => {
    try {
      // Register user with a temporary email, using existing userId
      const email = `${userId}@temp.local`;
      const result = await api.register(email, userId);
      // Update userId if server returned a different one
      if (result.user_id && result.user_id !== userId) {
        setUserId(result.user_id);
        localStorage.setItem('userId', result.user_id);
      }
      // Then load documents
      loadDocuments();
    } catch (error) {
      console.error('Failed to register user:', error);
      // Still try to load documents in case user already exists
      loadDocuments();
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments(userId);
      setDocuments(docs);
    } catch (error) {
      // Silently fail - it's okay if there are no documents yet
      // Only log if it's not a "no documents" scenario
      if (!error.message.includes('Failed to fetch')) {
        console.error('Failed to load documents:', error);
      }
      setDocuments([]);
    }
  };

  const handleSend = async (text) => {
    if (!text.trim()) return;

    // Add user message immediately
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await api.sendMessage(text, userId);
      
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources || [],
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error(error.message || 'Failed to get response');
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
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
      
      // Remove messages that reference this document
      setMessages((prev) =>
        prev.filter((msg) => {
          if (msg.sources) {
            return !msg.sources.some((s) => s.doc_id === documentId);
          }
          return true;
        })
      );
    } catch (error) {
      toast.error(error.message || 'Delete failed');
      console.error('Delete error:', error);
    }
  };

  const handleProfileClick = () => {
    toast('Profile settings coming soon!', { icon: '👤' });
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1E293B',
            color: '#F1F5F9',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#3B82F6',
              secondary: '#F1F5F9',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#F1F5F9',
            },
          },
        }}
      />

      <TopNav
        onDocumentsClick={() => setSidebarOpen(true)}
        onProfileClick={handleProfileClick}
      />

      <ChatArea messages={messages} isTyping={isTyping} />

      <InputArea
        onSend={handleSend}
        onFileUpload={handleFileUpload}
        uploadProgress={uploadProgress}
        uploading={uploading}
      />

      <DocumentsSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        documents={documents}
        onDelete={handleDeleteDocument}
        onUpload={handleFileUpload}
        uploadProgress={uploadProgress}
      />
    </div>
  );
}

export default App;
