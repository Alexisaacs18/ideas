import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import TopNav from '../components/TopNav';
import ChatArea from '../components/ChatArea';
import InputArea from '../components/InputArea';
import MainSidebar from '../components/MainSidebar';
import DocumentsSidebar from '../components/DocumentsSidebar';
import Settings from '../components/Settings';
import Profile from '../components/Profile';
import Auth from '../components/Auth';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../utils/api';

export default function Home() {
  const [userId, setUserId] = useState(() => {
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
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
  const [mainSidebarOpen, setMainSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('sidebarOpen');
    return stored ? JSON.parse(stored) : false;
  });
  const [chatHistory, setChatHistory] = useState(() => {
    const stored = localStorage.getItem('chatHistory');
    return stored ? JSON.parse(stored) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem('currentChatId') || null;
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [deleteChatModal, setDeleteChatModal] = useState({ isOpen: false, chatId: null });
  const [deleteDocModal, setDeleteDocModal] = useState({ isOpen: false, docId: null });

  // Register user on mount
  useEffect(() => {
    const registerUser = async () => {
      try {
        const email = user?.email || `${userId}@temp.local`;
        // Always pass userId to ensure the user is created with the correct ID
        // This ensures anonymous users work without sign-in
        const result = await api.register(email, userId);
        // Update userId if registration returned a different ID (shouldn't happen, but be safe)
        if (result.user_id && result.user_id !== userId) {
          setUserId(result.user_id);
          localStorage.setItem('userId', result.user_id);
        }
      } catch (error) {
        console.error('Failed to register user:', error);
        // Don't block the app if registration fails - upload will handle user creation
        // This allows the app to work even if registration fails
      }
    };
    registerUser();
    loadDocuments();
  }, [userId, user]);

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments(userId);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    }
  };

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      toast.error(`OAuth error: ${error}`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      const exchangeCode = async () => {
        try {
          const redirectUri = window.location.origin;
          
          let userData;
          let usedBackend = false;
          // Get current anonymous userId to transfer data on first sign-in
          const anonymousUserId = localStorage.getItem('userId');
          try {
            userData = await api.oauthCallback(code, redirectUri, anonymousUserId);
            usedBackend = true;
          } catch (backendError) {
            console.log('Backend OAuth not available, using frontend exchange');
            try {
              const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
              const clientSecret = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET;
              
              if (!clientId || !clientSecret) {
                throw new Error('OAuth credentials not configured');
              }

              // Frontend token exchange
              const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  code,
                  client_id: clientId,
                  client_secret: clientSecret,
                  redirect_uri: redirectUri,
                  grant_type: 'authorization_code',
                }),
              });

              if (!tokenResponse.ok) {
                throw new Error('Token exchange failed');
              }

              const tokenData = await tokenResponse.json();
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
              });

              if (!userInfoResponse.ok) {
                throw new Error('Failed to get user info');
              }

              const googleUser = await userInfoResponse.json();
              // Use existing userId to keep data linked, backend will handle account linking
              userData = {
                user_id: userId, // Use existing userId to preserve data
                email: googleUser.email,
                name: googleUser.name,
                avatar: googleUser.picture,
                created_at: new Date().toISOString(),
              };
            } catch (frontendError) {
              console.error('Frontend OAuth error:', frontendError);
              toast.error('OAuth authentication failed');
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            }
          }

          if (userData) {
            // Always use the userId returned from OAuth (authenticated user's ID)
            const authenticatedUserId = userData.user_id;
            
            // Update userId to authenticated user's ID
            setUserId(authenticatedUserId);
            localStorage.setItem('userId', authenticatedUserId);
            
            setUser({
              id: authenticatedUserId,
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar,
            });
            localStorage.setItem('user', JSON.stringify({
              id: authenticatedUserId,
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar,
            }));
            toast.success('Signed in successfully!');
            
            // Reload documents with the authenticated userId
            loadDocuments();
          }

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error('OAuth authentication failed');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      exchangeCode();
    }
  }, []);

  // Check for pending chat ID from navigation (when coming from Documents page)
  useEffect(() => {
    const pendingChatId = localStorage.getItem('pendingChatId');
    if (pendingChatId) {
      localStorage.removeItem('pendingChatId');
      handleSelectChat(pendingChatId);
    }
  }, []);

  const handleSend = async (message) => {
    if (!message.trim()) return;

    // Auto-create chat if none exists
    let chatId = currentChatId;
    if (!chatId) {
      chatId = crypto.randomUUID();
      setCurrentChatId(chatId);
      localStorage.setItem('currentChatId', chatId);
      
      const newChat = {
        id: chatId,
        title: message.substring(0, 30),
        timestamp: Date.now(),
      };
      setChatHistory(prev => {
        const updated = [newChat, ...prev];
        localStorage.setItem('chatHistory', JSON.stringify(updated));
        return updated;
      });
    }

    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
      return updated;
    });

    setIsTyping(true);

    try {
      const response = await api.sendMessage(message, userId);
      
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources || [],
        timestamp: Date.now(),
      };

      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(updated));
        return updated;
      });

      // Update chat title if it's still the default
      if (chatHistory.find(c => c.id === chatId)?.title === message.substring(0, 30)) {
        const title = response.answer.substring(0, 30) || 'New Chat';
        setChatHistory(prev => {
          const updated = prev.map(chat => 
            chat.id === chatId ? { ...chat, title } : chat
          );
          localStorage.setItem('chatHistory', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to get response');
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    localStorage.removeItem('currentChatId');
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    localStorage.setItem('currentChatId', chatId);
    
    const chatData = localStorage.getItem(`chat_${chatId}`);
    if (chatData) {
      try {
        setMessages(JSON.parse(chatData));
      } catch (error) {
        console.error('Failed to load chat messages:', error);
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
    
    if (window.innerWidth < 768) {
      setMainSidebarOpen(false);
    }
  };

  const handleDeleteChat = (chatId) => {
    setDeleteChatModal({ isOpen: true, chatId });
  };

  const confirmDeleteChat = () => {
    const { chatId } = deleteChatModal;
    setChatHistory(prev => {
      const updated = prev.filter(chat => chat.id !== chatId);
      localStorage.setItem('chatHistory', JSON.stringify(updated));
      return updated;
    });
    localStorage.removeItem(`chat_${chatId}`);
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
      localStorage.removeItem('currentChatId');
    }
    setDeleteChatModal({ isOpen: false, chatId: null });
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleSignOut = () => {
    // Sign out and clear userId to start a fresh anonymous session
    // This ensures accounts are separate after first sign-in
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userId'); // Clear userId to start new anonymous session
    localStorage.removeItem('chatHistory'); // Clear chat history
    localStorage.removeItem('currentChatId'); // Clear current chat
    
    // Generate new anonymous userId
    const newAnonymousId = crypto.randomUUID();
    setUserId(newAnonymousId);
    localStorage.setItem('userId', newAnonymousId);
    
    // Clear local state
    setMessages([]);
    setDocuments([]);
    setChatHistory([]);
    setCurrentChatId(null);
    
    setProfileOpen(false);
    toast.success('Signed out successfully');
  };

  const handleAuthSuccess = async (userData) => {
    // For email/password auth, use the userId from userData or generate new one
    const authenticatedUserId = userData.id || userData.user_id || crypto.randomUUID();
    
    // Get current anonymous userId to potentially transfer data
    const anonymousUserId = localStorage.getItem('userId');
    
    // If this is first sign-in and we have anonymous data, we could transfer it here
    // For now, just switch to authenticated account
    setUserId(authenticatedUserId);
    localStorage.setItem('userId', authenticatedUserId);
    
    setUser({
      id: authenticatedUserId,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
    });
    localStorage.setItem('user', JSON.stringify({
      id: authenticatedUserId,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
    }));
    
    setAuthOpen(false);
    toast.success('Signed in successfully!');
    
    // Reload documents with authenticated userId
    await loadDocuments();
  };

  const handleProfileClick = () => {
    if (user) {
      setProfileOpen(true);
    } else {
      setAuthOpen(true);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'text/plain',
      'text/csv',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/heic'
    ];
    const validExtensions = ['.pdf', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.heic'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast.error('Please upload PDF, TXT, CSV, or image files (PNG, JPG, JPEG, HEIC)');
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
    setDeleteDocModal({ isOpen: true, docId: documentId });
  };

  const confirmDeleteDocument = async () => {
    const { docId } = deleteDocModal;
    try {
      await api.deleteDocument(docId);
      toast.success('Document deleted');
      await loadDocuments();
      
      // Remove messages that reference this document
      setMessages((prev) =>
        prev.filter((msg) => {
          if (msg.sources) {
            return !msg.sources.some((s) => s.doc_id === docId);
          }
          return true;
        })
      );
      setDeleteDocModal({ isOpen: false, docId: null });
    } catch (error) {
      toast.error(error.message || 'Delete failed');
      console.error('Delete error:', error);
      setDeleteDocModal({ isOpen: false, docId: null });
    }
  };

  const handleDeleteAllChats = () => {
    const allChatIds = chatHistory.map(chat => chat.id);
    allChatIds.forEach(chatId => {
      localStorage.removeItem(`chat_${chatId}`);
    });
    
    setChatHistory([]);
    setCurrentChatId(null);
    setMessages([]);
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('currentChatId');
    toast.success('All chats deleted');
  };

  const handleDeleteAccount = async () => {
    try {
      handleDeleteAllChats();
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
          duration: 4000,
          style: {
            background: '#0F172A',
            color: '#F1F5F9',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            minWidth: '320px',
            maxWidth: '420px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#F1F5F9',
            },
            style: {
              background: '#0F172A',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.1)',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#F1F5F9',
            },
            style: {
              background: '#0F172A',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.1)',
            },
          },
        }}
      />

      {/* Main Sidebar */}
      <MainSidebar
        isOpen={mainSidebarOpen}
        onToggle={() => setMainSidebarOpen(!mainSidebarOpen)}
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          onDocumentsClick={() => setSidebarOpen(true)}
          onProfileClick={handleProfileClick}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatArea messages={messages} isTyping={isTyping} />
          <InputArea onSend={handleSend} />
        </div>
      </div>

      {/* Documents Sidebar */}
      <DocumentsSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        documents={documents}
        onDelete={handleDeleteDocument}
        onUpload={handleFileUpload}
        uploadProgress={uploadProgress}
        onDocumentAdded={loadDocuments}
        userId={userId}
      />

      {/* Modals */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        documents={documents}
        chatHistory={chatHistory}
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

      {/* Delete Chat Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteChatModal.isOpen}
        onClose={() => setDeleteChatModal({ isOpen: false, chatId: null })}
        onConfirm={confirmDeleteChat}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Delete Document Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteDocModal.isOpen}
        onClose={() => setDeleteDocModal({ isOpen: false, docId: null })}
        onConfirm={confirmDeleteDocument}
        title="Delete Document"
        message="Are you sure you want to delete this document? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

