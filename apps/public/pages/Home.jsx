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
  // Helper functions to scope localStorage keys to userId
  const getChatHistoryKey = (uid) => `chatHistory_${uid}`;
  const getCurrentChatKey = (uid) => `currentChatId_${uid}`;
  const getChatDataKey = (uid, chatId) => `chat_${uid}_${chatId}`;

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
    const stored = localStorage.getItem(getChatHistoryKey(userId));
    return stored ? JSON.parse(stored) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem(getCurrentChatKey(userId)) || null;
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
      // Always fetch fresh from API (no caching)
      const docs = await api.getDocuments(userId);
      setDocuments(docs || []); // Ensure it's always an array
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]); // Clear documents on error
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
              toast.error('Unable to sign in. Please try again.');
              window.history.replaceState({}, document.title, window.location.pathname);
              return;
            }
          }

          if (userData) {
            // Always use the userId returned from OAuth (authenticated user's ID)
            const authenticatedUserId = userData.user_id;
            const oldUserId = userId;
            
            // Check if this is a new user (signup) or existing user (signin)
            // Backend returns is_new_user flag, or we can check if user existed before
            const isSignUp = userData.is_new_user === true || !user;
            
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
            
            // Clear old user's chats from localStorage if signing IN (not signing up)
            if (!isSignUp && oldUserId !== authenticatedUserId) {
              // Clear anonymous user's localStorage chats
              localStorage.removeItem(getChatHistoryKey(oldUserId));
              localStorage.removeItem(getCurrentChatKey(oldUserId));
              if (currentChatId) {
                localStorage.removeItem(getChatDataKey(oldUserId, currentChatId));
              }
              // Clear local state
              setChatHistory([]);
              setCurrentChatId(null);
              setMessages([]);
            } else if (isSignUp) {
              // On signup, chats were transferred by backend, but localStorage still has old keys
              // We need to migrate localStorage chats to new userId
              const oldChatHistory = localStorage.getItem(getChatHistoryKey(oldUserId));
              if (oldChatHistory && oldUserId !== authenticatedUserId) {
                // Copy chat history to new userId
                localStorage.setItem(getChatHistoryKey(authenticatedUserId), oldChatHistory);
                // Copy individual chat data
                try {
                  const chats = JSON.parse(oldChatHistory);
                  chats.forEach(chat => {
                    const oldChatData = localStorage.getItem(getChatDataKey(oldUserId, chat.id));
                    if (oldChatData) {
                      localStorage.setItem(getChatDataKey(authenticatedUserId, chat.id), oldChatData);
                    }
                  });
                } catch (e) {
                  console.error('Error migrating chats:', e);
                }
              }
            }
            
            toast.success(isSignUp ? 'Account created successfully!' : 'Signed in successfully!');
            
            // Reload documents with the authenticated userId
            loadDocuments();
          }

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error('Unable to sign in. Please try again.');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      exchangeCode();
    }
  }, []);

  // Update chat history when userId changes
  useEffect(() => {
    const stored = localStorage.getItem(getChatHistoryKey(userId));
    if (stored) {
      try {
        setChatHistory(JSON.parse(stored));
      } catch (e) {
        setChatHistory([]);
      }
    } else {
      setChatHistory([]);
    }
    
    const storedChatId = localStorage.getItem(getCurrentChatKey(userId));
    setCurrentChatId(storedChatId || null);
    
    if (storedChatId) {
      const chatData = localStorage.getItem(getChatDataKey(userId, storedChatId));
      if (chatData) {
        try {
          setMessages(JSON.parse(chatData));
        } catch (e) {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [userId]);

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
      localStorage.setItem(getCurrentChatKey(userId), chatId);
      
      const newChat = {
        id: chatId,
        title: message.substring(0, 30),
        timestamp: Date.now(),
      };
      setChatHistory(prev => {
        const updated = [newChat, ...prev];
        localStorage.setItem(getChatHistoryKey(userId), JSON.stringify(updated));
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
      localStorage.setItem(getChatDataKey(userId, chatId), JSON.stringify(updated));
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
        localStorage.setItem(getChatDataKey(userId, chatId), JSON.stringify(updated));
        return updated;
      });

      // Update chat title if it's still the default
      if (chatHistory.find(c => c.id === chatId)?.title === message.substring(0, 30)) {
        const title = response.answer.substring(0, 30) || 'New Chat';
        setChatHistory(prev => {
          const updated = prev.map(chat => 
            chat.id === chatId ? { ...chat, title } : chat
          );
          localStorage.setItem(getChatHistoryKey(userId), JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      // Error message is already user-friendly from api.js
      toast.error(error.message || 'Unable to send your message. Please try again.');
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    localStorage.removeItem(getCurrentChatKey(userId));
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    localStorage.setItem(getCurrentChatKey(userId), chatId);
    
    const chatData = localStorage.getItem(getChatDataKey(userId, chatId));
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
      localStorage.setItem(getChatHistoryKey(userId), JSON.stringify(updated));
      return updated;
    });
    localStorage.removeItem(getChatDataKey(userId, chatId));
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
      localStorage.removeItem(getCurrentChatKey(userId));
    }
    setDeleteChatModal({ isOpen: false, chatId: null });
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleSignOut = () => {
    // Sign out and clear userId to start a fresh anonymous session
    // This ensures accounts are separate after first sign-in
    const oldUserId = userId;
    
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userId'); // Clear userId to start new anonymous session
    
    // Clear old user's chats from localStorage
    localStorage.removeItem(getChatHistoryKey(oldUserId));
    localStorage.removeItem(getCurrentChatKey(oldUserId));
    // Clear all chat data for old user (we can't enumerate all, but clear current)
    if (currentChatId) {
      localStorage.removeItem(getChatDataKey(oldUserId, currentChatId));
    }
    
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

  const handleAuthSuccess = async (userData, isSignUp = false) => {
    // For email/password auth, use the userId from userData
    const authenticatedUserId = userData.id || userData.user_id;
    const oldUserId = userId;
    
    // Switch to authenticated account
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
    
    // Clear old user's chats from localStorage if signing IN (not signing up)
    // On signup, chats are transferred by backend, so we keep localStorage chats
    if (!isSignUp && oldUserId !== authenticatedUserId) {
      // Clear anonymous user's localStorage chats
      localStorage.removeItem(getChatHistoryKey(oldUserId));
      localStorage.removeItem(getCurrentChatKey(oldUserId));
      if (currentChatId) {
        localStorage.removeItem(getChatDataKey(oldUserId, currentChatId));
      }
      // Clear local state
      setChatHistory([]);
      setCurrentChatId(null);
      setMessages([]);
    } else if (isSignUp) {
      // On signup, load chats for the new user (they were transferred by backend)
      // Chats in localStorage will be for the new userId after transfer
      const newChatHistory = localStorage.getItem(getChatHistoryKey(authenticatedUserId));
      if (newChatHistory) {
        try {
          setChatHistory(JSON.parse(newChatHistory));
        } catch (e) {
          setChatHistory([]);
        }
      }
    }
    
    setAuthOpen(false);
    toast.success(isSignUp ? 'Account created successfully!' : 'Signed in successfully!');
    
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

    // FIRST: Validate file size BEFORE anything else - this prevents any backend call
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const isImage = file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.heic'].includes(fileExtension);
    const maxSizeBytes = isImage ? 1 * 1024 * 1024 : 10 * 1024 * 1024; // 1MB for images, 10MB for others
    const maxSizeMB = isImage ? 1 : 10;
    
    // Strict validation: file must be LESS than maxSize (not equal to)
    if (file.size >= maxSizeBytes) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`File size limit exceeded. Your file is ${fileSizeMB}MB, but the maximum is ${maxSizeMB}MB for ${isImage ? 'images' : 'documents'}.`);
      return; // STOP HERE - don't proceed to backend
    }

    // SECOND: Validate file type
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
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast.error('Please upload PDF, TXT, CSV, or image files (PNG, JPG, JPEG, HEIC)');
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
      // Error message is already user-friendly from api.js
      toast.error(error.message || 'Unable to upload your file. Please try again.');
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
      await api.deleteDocument(docId, userId);
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
      // Error message is already user-friendly from api.js
      toast.error(error.message || 'Unable to delete the document. Please try again.');
      console.error('Delete error:', error);
      setDeleteDocModal({ isOpen: false, docId: null });
    }
  };

  const handleDeleteAllChats = () => {
    const allChatIds = chatHistory.map(chat => chat.id);
    allChatIds.forEach(chatId => {
      localStorage.removeItem(getChatDataKey(userId, chatId));
    });
    
    setChatHistory([]);
    setCurrentChatId(null);
    setMessages([]);
    localStorage.removeItem(getChatHistoryKey(userId));
    localStorage.removeItem(getCurrentChatKey(userId));
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
    <div className="h-screen flex bg-background overflow-hidden relative">
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
      <div className="flex-1 flex flex-col min-w-0 w-full sm:w-auto">
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

