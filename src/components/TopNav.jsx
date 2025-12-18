import { FileText, User } from 'lucide-react';

export default function TopNav({ onDocumentsClick, onProfileClick }) {
  return (
    <nav className="glass border-b border-border/50 h-12 px-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-text-primary">Second Brain</h1>
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

