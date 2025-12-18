import { FileText } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full mb-6 animate-fade-in ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-3xl px-5 py-4 rounded-2xl ${
          isUser
            ? 'gradient-accent text-white'
            : 'glass text-text-primary border border-border/50'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-xs text-text-secondary mb-2">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, idx) => (
                <button
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/50 hover:bg-surface border border-border/30 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  onClick={() => {
                    // Future: highlight relevant text
                    console.log('Source clicked:', source);
                  }}
                >
                  <FileText size={12} />
                  <span>{source.filename}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {message.timestamp && (
          <p className={`text-xs mt-2 ${isUser ? 'text-white/70' : 'text-text-secondary'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}

