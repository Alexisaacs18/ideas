import { X, LogOut, Mail, Calendar } from 'lucide-react';

export default function Profile({ isOpen, onClose, user, onSignOut }) {
  if (!isOpen || !user) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-xl w-[90%] max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-transparent border-none text-slate-400 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-24 h-24 rounded-full gradient-accent flex items-center justify-center text-white text-4xl font-semibold">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{user.name?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <button className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-xs cursor-pointer transition-all hover:bg-slate-700">
              Change Photo
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex flex-col gap-5 mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Name</label>
              <input
                type="text"
                defaultValue={user.name}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400" />
              <div className="flex-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                <div className="text-sm text-slate-100">{user.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-slate-400" />
              <div className="flex-1">
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Member since</label>
                <div className="text-sm text-slate-100">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 py-2.5 rounded-lg bg-indigo-500 border-none text-white text-sm font-medium cursor-pointer transition-all hover:opacity-90">
              Save Changes
            </button>
            <button
              className="flex-1 py-2.5 rounded-lg bg-transparent border border-slate-700 text-slate-400 text-sm font-medium cursor-pointer transition-all hover:bg-slate-800 hover:text-slate-100 flex items-center justify-center gap-2"
              onClick={() => {
                onSignOut();
                onClose();
              }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

