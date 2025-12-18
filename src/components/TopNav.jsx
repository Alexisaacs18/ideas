import { FileText, User } from 'lucide-react';

export default function TopNav({ onDocumentsClick, onProfileClick }) {
  return (
    <nav className="glass border-b border-border/50 h-12 px-3 sm:px-5 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <h1 className="text-sm sm:text-lg font-semibold text-text-primary truncate">
          <span className="hidden sm:inline">Prosey: Your Second Brain and Digital Garden</span>
          <span className="sm:hidden">Prosey</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <button
          onClick={onDocumentsClick}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg hover:bg-surface/50 transition-colors text-text-secondary hover:text-text-primary"
          title="My Documents"
        >
          <FileText size={18} className="sm:w-[18px] sm:h-[18px] w-5 h-5" />
          <span className="hidden sm:inline">My Documents</span>
        </button>
        
        <button
          onClick={onProfileClick}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface hover:bg-surface/80 border border-border/50 flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
          title="Profile"
        >
          <User size={16} className="sm:w-[18px] sm:h-[18px] text-text-secondary" />
        </button>
      </div>
    </nav>
  );
}

