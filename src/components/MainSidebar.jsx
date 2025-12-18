import { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Settings, 
  User, 
  FileText, 
  X, 
  Trash2,
  ChevronRight,
  History
} from 'lucide-react';

export default function MainSidebar({ 
  isOpen, 
  onClose, 
  onNewChat,
  onDocumentsClick,
  onSettingsClick,
  onProfileClick,
  chatHistory = [],
  onSelectChat,
  onDeleteChat,
  currentChatId
}) {
  const [activeSection, setActiveSection] = useState('chats');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-surface border-r border-border/50 z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">SB</span>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Second Brain</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface/80 flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-border/50">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium transition-colors"
          >
            <Plus size={20} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/50">
          <button
            onClick={() => setActiveSection('chats')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'chats'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare size={16} />
              <span>Chats</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'history'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <History size={16} />
              <span>History</span>
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'chats' && (
            <div className="p-2">
              {chatHistory.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare size={48} className="mx-auto text-text-tertiary mb-4 opacity-50" />
                  <p className="text-text-secondary text-sm">No chats yet</p>
                  <p className="text-text-tertiary text-xs mt-1">Start a new conversation</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        currentChatId === chat.id
                          ? 'bg-accent/10 border border-accent/20'
                          : 'hover:bg-surface/80'
                      }`}
                      onClick={() => onSelectChat(chat.id)}
                    >
                      <MessageSquare 
                        size={18} 
                        className={`flex-shrink-0 ${
                          currentChatId === chat.id ? 'text-accent' : 'text-text-tertiary'
                        }`} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {chat.title || 'New Chat'}
                        </p>
                        {chat.lastMessage && (
                          <p className="text-xs text-text-tertiary truncate mt-0.5">
                            {chat.lastMessage}
                          </p>
                        )}
                        {chat.timestamp && (
                          <p className="text-xs text-text-tertiary mt-1">
                            {new Date(chat.timestamp).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-surface transition-all"
                      >
                        <Trash2 size={14} className="text-text-tertiary hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'history' && (
            <div className="p-2">
              <div className="text-center py-12 px-4">
                <History size={48} className="mx-auto text-text-tertiary mb-4 opacity-50" />
                <p className="text-text-secondary text-sm">Chat history</p>
                <p className="text-text-tertiary text-xs mt-1">Your conversation history will appear here</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border/50 p-2 space-y-1">
          <button
            onClick={onDocumentsClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface/80 transition-colors text-text-secondary hover:text-text-primary"
          >
            <FileText size={18} />
            <span className="text-sm font-medium">My Documents</span>
            <ChevronRight size={16} className="ml-auto text-text-tertiary" />
          </button>
          
          <button
            onClick={onSettingsClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface/80 transition-colors text-text-secondary hover:text-text-primary"
          >
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
            <ChevronRight size={16} className="ml-auto text-text-tertiary" />
          </button>
          
          <button
            onClick={onProfileClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface/80 transition-colors text-text-secondary hover:text-text-primary"
          >
            <User size={18} />
            <span className="text-sm font-medium">Profile</span>
            <ChevronRight size={16} className="ml-auto text-text-tertiary" />
          </button>
        </div>
      </div>
    </>
  );
}

