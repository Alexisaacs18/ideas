import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import TopNav from '../components/TopNav';
import ChatArea from '../components/ChatArea';
import InputArea from '../components/InputArea';
import MainSidebar from '../components/MainSidebar';
import Settings from '../components/Settings';
import Profile from '../components/Profile';
import Auth from '../components/Auth';
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
  const [isTyping, setIsTyping] = useState(false);
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

  // Register user on mount
  useEffect(() => {
    const registerUser = async () => {
      try {
        const email = user?.email || `${userId}@temp.local`;
        await api.registerUser(email);
      } catch (error) {
        console.error('Failed to register user:', error);
      }
    };
    registerUser();
  }, [userId, user]);

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
          try {
            userData = await api.oauthCallback(code, redirectUri);
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
              userData = {
                user_id: crypto.randomUUID(),
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
            setUser({
              id: userData.user_id,
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar,
            });
            localStorage.setItem('user', JSON.stringify({
              id: userData.user_id,
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar,
            }));
            toast.success('Signed in successfully!');
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

  const handleSettingsClick = () => {
    setSettingsOpen(true);
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

  const handleProfileClick = () => {
    if (user) {
      setProfileOpen(true);
    } else {
      setAuthOpen(true);
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
          onProfileClick={handleProfileClick}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatArea messages={messages} isTyping={isTyping} />
          <InputArea onSend={handleSend} />
        </div>
      </div>

      {/* Modals */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        documents={[]}
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
    </div>
  );
}

