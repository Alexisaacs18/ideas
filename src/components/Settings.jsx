import { useState } from 'react';
import { X, User, Bell, Lock, Trash2, Moon, Globe } from 'lucide-react';

export default function Settings({ isOpen, onClose, user, documents = [] }) {
  const [emailNotifications, setEmailNotifications] = useState(true);

  if (!isOpen) return null;

  const documentCount = documents.length;
  const documentLimit = 50;
  const storagePercent = (documentCount / documentLimit) * 100;

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
          <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-transparent border-none text-slate-400 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Account Section */}
          <section className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Account
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg mb-2">
              <div className="flex items-center gap-3 flex-1">
                <User size={18} className="text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Email</div>
                  <div className="text-xs text-slate-400 mt-0.5">{user?.email || 'Not set'}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Lock size={18} className="text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Password</div>
                  <div className="text-xs text-slate-400 mt-0.5">••••••••</div>
                </div>
              </div>
              <button className="px-4 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-xs cursor-pointer transition-all hover:bg-slate-700">
                Change
              </button>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Preferences
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg mb-2">
              <div className="flex items-center gap-3 flex-1">
                <Moon size={18} className="text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Theme</div>
                  <div className="text-xs text-slate-400 mt-0.5">Dark mode</div>
                </div>
              </div>
              <select className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-xs cursor-pointer">
                <option>Dark</option>
                <option>Light</option>
                <option>System</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Globe size={18} className="text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Language</div>
                  <div className="text-xs text-slate-400 mt-0.5">English</div>
                </div>
              </div>
              <select className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-xs cursor-pointer">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Notifications
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Bell size={18} className="text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Email notifications</div>
                  <div className="text-xs text-slate-400 mt-0.5">Get updates via email</div>
                </div>
              </div>
              <label className="relative inline-block w-11 h-6 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only" 
                />
                <span className={`absolute inset-0 rounded-full transition-colors ${emailNotifications ? 'bg-indigo-500' : 'bg-slate-700'}`}></span>
                <span className={`absolute h-[18px] w-[18px] left-[3px] bottom-[3px] bg-white rounded-full transition-transform ${emailNotifications ? 'translate-x-[20px]' : ''}`}></span>
              </label>
            </div>
          </section>

          {/* Storage Section */}
          <section className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Storage
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg mb-2">
              <div>
                <div className="text-sm font-medium text-slate-100">Documents used</div>
                <div className="text-xs text-slate-400 mt-0.5">{documentCount} of {documentLimit}</div>
              </div>
            </div>
            
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${storagePercent}%` }}
              ></div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="border-t border-red-500/20 pt-6">
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-4">
              Danger Zone
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-red-500/20 rounded-lg mb-2">
              <div className="flex items-center gap-3 flex-1">
                <Trash2 size={18} className="text-red-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Delete all chats</div>
                  <div className="text-xs text-slate-400 mt-0.5">Permanently delete chat history</div>
                </div>
              </div>
              <button className="px-4 py-1.5 bg-transparent border border-red-500/30 rounded-md text-red-400 text-xs cursor-pointer transition-all hover:bg-red-500/10 hover:border-red-500/50">
                Delete
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Trash2 size={18} className="text-red-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Delete account</div>
                  <div className="text-xs text-slate-400 mt-0.5">Permanently delete your account</div>
                </div>
              </div>
              <button className="px-4 py-1.5 bg-transparent border border-red-500/30 rounded-md text-red-400 text-xs cursor-pointer transition-all hover:bg-red-500/10 hover:border-red-500/50">
                Delete
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

