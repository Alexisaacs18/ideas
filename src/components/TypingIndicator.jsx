export default function TypingIndicator() {
  return (
    <div className="flex w-full mb-6 justify-start animate-fade-in">
      <div className="glass px-5 py-4 rounded-2xl border border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-text-secondary animate-bounce-dots" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-text-secondary animate-bounce-dots" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-text-secondary animate-bounce-dots" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

