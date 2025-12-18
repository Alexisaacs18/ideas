import { FileText, User, Menu } from 'lucide-react';

export default function TopNav({ onDocumentsClick, onProfileClick, onMenuClick }) {
  return (
    <nav className="glass border-b border-border/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="w-9 h-9 rounded-lg hover:bg-surface/50 flex items-center justify-center transition-colors lg:hidden"
        >
          <Menu size={20} className="text-text-secondary" />
        </button>
        <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
          <span className="text-white font-bold text-sm">SB</span>
        </div>
        <h1 className="text-xl font-semibold text-text-primary">Second Brain</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button
          onClick={onDocumentsClick}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-surface/50 transition-colors text-text-secondary hover:text-text-primary"
        >
          <FileText size={18} />
          <span>My Documents</span>
        </button>
        
        <button
          onClick={onProfileClick}
          className="w-9 h-9 rounded-full bg-surface hover:bg-surface/80 border border-border/50 flex items-center justify-center transition-all hover:scale-105"
        >
          <User size={18} className="text-text-secondary" />
        </button>
      </div>
    </nav>
  );
}

