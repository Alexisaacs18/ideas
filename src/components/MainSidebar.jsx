import { useState, useEffect } from 'react';
import { 
  Menu, 
  MessageSquare, 
  FileText, 
  Settings, 
  User
} from 'lucide-react';

// SidebarItem component with tooltip
function SidebarItem({ 
  icon: Icon, 
  label, 
  onClick, 
  active = false,
  isOpen,
  badge
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => !isOpen && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          w-full h-12 flex items-center transition-all duration-200
          ${isOpen ? 'justify-start px-4 gap-3' : 'justify-center'}
          ${active 
            ? 'bg-slate-800 text-slate-100' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }
          rounded-lg
        `}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {isOpen && (
          <span className="text-sm font-medium flex-1 text-left">{label}</span>
        )}
        {badge && isOpen && (
          <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </button>
      
      {/* Tooltip when closed */}
      {!isOpen && showTooltip && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-slate-100 text-sm rounded-lg shadow-lg z-50 whitespace-nowrap pointer-events-none">
          {label}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
            <div className="border-4 border-transparent border-r-slate-800"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MainSidebar({ 
  isOpen,
  onToggle,
  onDocumentsClick,
  onSettingsClick,
  onProfileClick,
  chatHistory = [],
  activeSection = 'chats',
  onSectionChange
}) {
  const [isMobile, setIsMobile] = useState(false);

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

  // Sidebar width
  const sidebarWidth = isOpen ? 'w-60' : 'w-16';
  const sidebarClasses = `
    h-screen
    bg-slate-900 border-r border-slate-700
    flex flex-col
    transition-all duration-300 ease-in-out
    ${sidebarWidth}
    ${isMobile && isOpen ? 'shadow-2xl fixed left-0 top-0 z-40' : ''}
  `;

  // Main content margin
  const mainContentMargin = isOpen ? 'ml-60' : 'ml-16';

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {/* Logo at top of sidebar */}
        <div className="flex justify-center py-3 px-3 border-b border-slate-700">
          <div className="w-6 h-6 rounded-lg gradient-accent flex items-center justify-center">
            <span className="text-white font-bold text-xs">SB</span>
          </div>
        </div>

        {/* Top section */}
        <div className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
          <SidebarItem
            icon={Menu}
            label="Menu"
            onClick={onToggle}
            active={false}
            isOpen={isOpen}
          />
          
          <SidebarItem
            icon={MessageSquare}
            label="Chats"
            onClick={() => {
              if (onSectionChange) onSectionChange('chats');
              if (isMobile && isOpen) onToggle();
            }}
            active={activeSection === 'chats'}
            isOpen={isOpen}
            badge={chatHistory.length > 0 ? chatHistory.length : null}
          />

          <SidebarItem
            icon={FileText}
            label="Documents"
            onClick={() => {
              if (onSectionChange) onSectionChange('documents');
              onDocumentsClick();
              if (isMobile) onToggle();
            }}
            active={activeSection === 'documents'}
            isOpen={isOpen}
          />
        </div>

        {/* Bottom section */}
        <div className="flex flex-col gap-1 p-2 border-t border-slate-700">
          <SidebarItem
            icon={Settings}
            label="Settings"
            onClick={() => {
              if (onSectionChange) onSectionChange('settings');
              onSettingsClick();
              if (isMobile) onToggle();
            }}
            active={activeSection === 'settings'}
            isOpen={isOpen}
          />

          <SidebarItem
            icon={User}
            label="Profile"
            onClick={() => {
              if (onSectionChange) onSectionChange('profile');
              onProfileClick();
              if (isMobile) onToggle();
            }}
            active={activeSection === 'profile'}
            isOpen={isOpen}
          />
        </div>
      </aside>
    </>
  );
}
