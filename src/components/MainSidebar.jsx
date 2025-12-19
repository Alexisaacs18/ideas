import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu,
  MessageSquare, 
  FileText, 
  Settings, 
  User,
  Plus,
  ChevronDown
} from 'lucide-react';

// Format time helper
function formatTime(timestamp) {
  if (!timestamp) return 'now';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function MainSidebar({ 
  isOpen,
  onToggle,
  onSettingsClick,
  onProfileClick,
  chatHistory = [],
  currentChatId,
  onSelectChat,
  onNewChat,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(true);
  
  // Determine active section based on route
  const activeSection = location.pathname === '/documents' ? 'documents' : 'chats';

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC to close on mobile
      if (e.key === 'Escape' && isOpen && isMobile) {
        onToggle();
      }
      // Cmd/Ctrl+B to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMobile, onToggle]);

  // Sidebar width - 48px collapsed, 240px expanded
  // On mobile, always full width when open
  const sidebarWidth = isMobile 
    ? (isOpen ? 'w-64' : 'w-12') 
    : (isOpen ? 'w-60' : 'w-12');
  const sidebarClasses = `
    h-screen
    bg-background
    flex flex-col
    transition-all duration-200 ease-in-out
    ${sidebarWidth}
    ${isMobile && isOpen ? 'shadow-2xl fixed left-0 top-0 z-50' : ''}
    ${isMobile && !isOpen ? 'relative' : ''}
  `;

  const handleNewChat = () => {
    if (location.pathname === '/documents') {
      // Navigate to home first
      navigate('/');
      return;
    }
    if (onNewChat) {
      onNewChat();
    }
    if (isMobile && isOpen) {
      onToggle();
    }
  };

  const handleSelectChat = (chatId) => {
    if (location.pathname === '/documents') {
      // Navigate to home first, then select chat
      // Store chat ID to select after navigation
      localStorage.setItem('pendingChatId', chatId);
      navigate('/');
      return;
    }
    if (onSelectChat) {
      onSelectChat(chatId);
    }
    if (isMobile && isOpen) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {/* Top section */}
        <div className="py-3">
          {/* Logo */}
          <div className="flex justify-center mb-3 px-3">
            <div className="w-6 h-6 rounded-lg gradient-accent flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
          </div>

          {/* Menu toggle button */}
          <div className="px-2 mb-1">
            <button
              onClick={onToggle}
              title="Menu"
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all duration-150
                ${isOpen ? 'justify-start' : 'justify-center'}
                text-slate-400 hover:bg-slate-800 hover:text-slate-100
              `}
            >
              <Menu size={18} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">Menu</span>}
            </button>
          </div>

          {/* Documents button - FIRST */}
          <div className="px-2 mb-1">
            <Link
              to="/documents"
              onClick={() => {
                if (isMobile && isOpen) onToggle();
              }}
              title="Documents"
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all duration-150
                ${isOpen ? 'justify-start' : 'justify-center'}
                ${activeSection === 'documents'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }
              `}
            >
              <FileText size={18} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">Documents</span>}
            </Link>
          </div>

          {/* Chats section - SECOND */}
          <div className="px-2 mb-2">
            {/* Chats header */}
            <div className="mb-1">
              <div className="flex items-center gap-1">
                {location.pathname === '/documents' ? (
                  <Link
                    to="/"
                    title="Chats"
                    className={`
                      flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all duration-150
                      ${isOpen ? 'justify-start' : 'justify-center'}
                      text-slate-400 hover:bg-slate-800 hover:text-slate-100
                    `}
                  >
                    <MessageSquare size={18} className="flex-shrink-0" />
                    {isOpen && <span className="text-sm font-medium">Chats</span>}
                  </Link>
                ) : (
                  <button
                    onClick={() => setChatsOpen(!chatsOpen)}
                    title="Chats"
                    className={`
                      flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all duration-150
                      ${isOpen ? 'justify-between' : 'justify-center'}
                      ${activeSection === 'chats'
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare size={18} className="flex-shrink-0" />
                      {isOpen && <span className="text-sm font-medium">Chats</span>}
                    </div>
                    {isOpen && (
                      <ChevronDown 
                        size={14} 
                        className={`transition-transform duration-200 flex-shrink-0 ${chatsOpen ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>
                )}

                {/* New chat button - only show on home page */}
                {isOpen && location.pathname === '/' && (
                  <button
                    onClick={onNewChat}
                    title="New chat"
                    className="w-7 h-7 rounded-md bg-transparent border border-slate-600 text-slate-400 hover:bg-slate-800 hover:border-slate-500 hover:text-slate-100 flex items-center justify-center transition-all duration-150"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Chat list - shown when expanded */}
            {isOpen && chatsOpen && (
              <div className="max-h-[300px] overflow-y-auto">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <p className="text-xs text-slate-500">No chats yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {chatHistory.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => handleSelectChat(chat.id)}
                        className={`
                          w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 text-left
                          ${currentChatId === chat.id
                            ? 'bg-indigo-500/10 text-slate-100 border border-indigo-500/20'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                          }
                        `}
                      >
                        <div className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-start">
                          <MessageSquare size={14} />
                        </div>
                        <span className="flex-1 text-sm truncate">
                          {chat.title || 'New Chat'}
                        </span>
                        {chat.timestamp && (
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {formatTime(chat.timestamp)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Spacer to push settings/profile to bottom */}
        <div className="flex-1" />

        {/* Bottom section */}
        <div className="pb-3">
          {/* Divider */}
          <div className="h-px bg-slate-700 mx-3 my-2" />

          {/* Settings and Profile */}
          <div className="px-2 space-y-1">
            <button
              onClick={() => {
                onSettingsClick();
                if (isMobile && isOpen) onToggle();
              }}
              title="Settings"
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all duration-150
                ${isOpen ? 'justify-start' : 'justify-center'}
                ${activeSection === 'settings'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }
              `}
            >
              <Settings size={18} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">Settings</span>}
            </button>

            <button
              onClick={() => {
                onProfileClick();
                if (isMobile && isOpen) onToggle();
              }}
              title="Profile"
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-all duration-150
                ${isOpen ? 'justify-start' : 'justify-center'}
                ${activeSection === 'profile'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }
              `}
            >
              <User size={18} className="flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">Profile</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
