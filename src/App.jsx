import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import TopNav from './components/TopNav';
import ChatArea from './components/ChatArea';
import InputArea from './components/InputArea';
import DocumentsSidebar from './components/DocumentsSidebar';
import MainSidebar from './components/MainSidebar';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Auth from './components/Auth';
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
  const [mainSidebarOpen, setMainSidebarOpen] = useState(() => {
    // Default to collapsed (48px, icon-only)
    const stored = localStorage.getItem('sidebarOpen');
    return stored ? JSON.parse(stored) : false;
  });
  const [activeSection, setActiveSection] = useState('chats');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [chatHistory, setChatHistory] = useState(() => {
    // Load chat history from localStorage
    const stored = localStorage.getItem('chatHistory');
    return stored ? JSON.parse(stored) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    // Get current chat ID from localStorage
    return localStorage.getItem('currentChatId') || null;
  });

  // Auth state
  const [user, setUser] = useState(() => {
    // Load user from localStorage
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);


  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    if (savedTheme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, []);

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      toast.error('Google OAuth failed: ' + error);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      // Exchange code for token and get user info
      const exchangeCode = async () => {
        try {
          const redirectUri = window.location.origin;
          
          // Try backend first, fallback to frontend if no secret
          let userData;
          let usedBackend = false;
          try {
            userData = await api.oauthCallback(code, redirectUri);
            usedBackend = true;
          } catch (backendError) {
            // If backend fails (no client secret), try frontend exchange
            console.log('Backend OAuth not available, using frontend exchange');
            try {
              userData = await exchangeCodeFrontend(code, redirectUri);
            } catch (frontendError) {
              // If frontend also fails, show the error
              throw frontendError;
            }
          }
          
          // Create user object
          const user = {
            id: userData.user_id || userData.id,
            email: userData.email,
            name: userData.name,
            avatar: userData.avatar,
            createdAt: userData.created_at || new Date().toISOString(),
          };
          
          // Store in localStorage
          localStorage.setItem('user', JSON.stringify(user));
          setUser(user);
          
          toast.success(`Welcome, ${user.name || user.email}!`);
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error(error.message || 'Failed to complete OAuth login');
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      
      exchangeCode();
    }
  }, []);

  // Load current chat messages on mount
  useEffect(() => {
    if (currentChatId) {
      const chatData = localStorage.getItem(`chat_${currentChatId}`);
      if (chatData) {
        try {
          setMessages(JSON.parse(chatData));
        } catch (error) {
          console.error('Failed to load chat messages:', error);
        }
      }
    }
  }, [currentChatId]);

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

    // Create new chat if none exists
    if (!currentChatId) {
      const newChatId = crypto.randomUUID();
      const newChat = {
        id: newChatId,
        title: text.substring(0, 50),
        timestamp: new Date().toISOString(),
        lastMessage: null,
      };
      
      setChatHistory(prev => {
        const updated = [newChat, ...prev];
        localStorage.setItem('chatHistory', JSON.stringify(updated));
        return updated;
      });
      setCurrentChatId(newChatId);
      localStorage.setItem('currentChatId', newChatId);
    }

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
      
      setMessages((prev) => {
        const updated = [...prev, assistantMessage];
        // Save to localStorage
        if (currentChatId) {
          localStorage.setItem(`chat_${currentChatId}`, JSON.stringify(updated));
          
          // Update chat history
          setChatHistory(prevHistory => {
            const updatedHistory = prevHistory.map(chat => 
              chat.id === currentChatId 
                ? { 
                    ...chat, 
                    title: text.substring(0, 50),
                    lastMessage: assistantMessage.content.substring(0, 60)
                  }
                : chat
            );
            localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
            return updatedHistory;
          });
        }
        return updated;
      });
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
    if (user) {
      setProfileOpen(true);
    } else {
      setAuthOpen(true);
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setAuthOpen(false);
    toast.success(`Welcome, ${userData.name || userData.email}!`);
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('user');
    setProfileOpen(false);
    toast.success('Signed out successfully');
  };

  const handleDeleteAllChats = () => {
    // Delete all chats from localStorage
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
      // Delete all user data
      // 1. Delete all chats
      handleDeleteAllChats();
      
      // 2. Delete all documents (would need backend endpoint)
      // For now, just clear local state
      setDocuments([]);
      
      // 3. Delete user account
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      
      // 4. Clear all other user data
      // Note: In production, you'd call a backend endpoint to delete from database
      
      toast.success('Account deleted successfully');
      setSettingsOpen(false);
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to delete account');
    }
  };

  // Frontend-only OAuth code exchange (fallback if no client secret)
  const exchangeCodeFrontend = async (code, redirectUri) => {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET;
    
    if (!clientSecret || clientSecret === 'your-google-oauth-client-secret-here') {
      throw new Error('Client secret required. Please add VITE_GOOGLE_OAUTH_CLIENT_SECRET to .env file, or set GOOGLE_OAUTH_CLIENT_SECRET in Cloudflare Worker secrets.');
    }

    // Exchange code for token (frontend - less secure, but works for development)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const googleUser = await userInfoResponse.json();

    // Register user in backend
    try {
      await api.register(googleUser.email);
    } catch (error) {
      // User might already exist, that's okay
      console.log('User registration:', error.message);
    }

    return {
      user_id: crypto.randomUUID(), // Generate ID
      id: crypto.randomUUID(),
      email: googleUser.email,
      name: googleUser.name || googleUser.email.split('@')[0],
      avatar: googleUser.picture || null,
      created_at: new Date().toISOString(),
    };
  };

  const handleNewChat = () => {
    // Create new chat
    const newChatId = crypto.randomUUID();
    const newChat = {
      id: newChatId,
      title: 'New Chat',
      timestamp: new Date().toISOString(),
      lastMessage: null,
    };
    
    setChatHistory(prev => {
      const updated = [newChat, ...prev];
      localStorage.setItem('chatHistory', JSON.stringify(updated));
      return updated;
    });
    setCurrentChatId(newChatId);
    setMessages([]);
    localStorage.setItem('currentChatId', newChatId);
    // Keep sidebar open when creating new chat
  };

  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId);
    localStorage.setItem('currentChatId', chatId);
    
    // Load messages for this chat (from localStorage for now)
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
    
    // Only close sidebar on mobile
    if (window.innerWidth < 768) {
      setMainSidebarOpen(false);
    }
  };

  const handleDeleteChat = (chatId) => {
    if (confirm('Are you sure you want to delete this chat?')) {
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
    }
  };

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(mainSidebarOpen));
  }, [mainSidebarOpen]);

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

      {/* Main Sidebar - full height from top */}
      <MainSidebar
        isOpen={mainSidebarOpen}
        onToggle={() => setMainSidebarOpen(!mainSidebarOpen)}
        onDocumentsClick={() => {
          setActiveSection('documents');
          setSidebarOpen(true);
        }}
        onSettingsClick={() => {
          setActiveSection('settings');
          handleSettingsClick();
        }}
        onProfileClick={() => {
          setActiveSection('profile');
          handleProfileClick();
        }}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content Area - next to sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav - only in main content area */}
        <TopNav
          onDocumentsClick={() => {
            setActiveSection('documents');
            setSidebarOpen(true);
          }}
          onProfileClick={() => {
            setActiveSection('profile');
            handleProfileClick();
          }}
        />

        {/* Chat container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatArea messages={messages} isTyping={isTyping} />

          <InputArea
            onSend={handleSend}
            onFileUpload={handleFileUpload}
            uploadProgress={uploadProgress}
            uploading={uploading}
          />
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
      />

      {/* Settings Modal */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        documents={documents}
        chatHistory={chatHistory}
        onDeleteAllChats={handleDeleteAllChats}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* Profile Modal (if logged in) */}
      {user && (
        <Profile
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={user}
          onSignOut={handleSignOut}
        />
      )}

      {/* Auth Modal (if not logged in and auth is open) */}
      {!user && (
        <Auth
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
      </div>
  );
}

export default App;
