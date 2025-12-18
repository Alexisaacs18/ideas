import { useState, useEffect } from 'react';
import { X, User, Bell, Trash2, Moon, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Settings({ 
  isOpen, 
  onClose, 
  user, 
  documents = [],
  chatHistory = [],
  onDeleteAllChats,
  onDeleteAccount
}) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to dark
    const saved = localStorage.getItem('theme');
    return saved || 'dark';
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Initialize theme on mount
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, []);

  if (!isOpen) return null;

  const documentCount = documents.length;
  const documentLimit = 50;
  const storagePercent = Math.max((documentCount / documentLimit) * 100, 2); // Min 2% to show progress bar

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    // Apply theme to document root
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    toast.success(`Theme changed to ${newTheme === 'light' ? 'Light' : 'Dark'} mode`);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      // TODO: Call API to change password
      // await api.changePassword(currentPassword, newPassword);
      
      // For now, just show success
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    }
  };

  const handleDeleteAllChats = () => {
    if (confirm('Are you sure you want to delete ALL chats? This cannot be undone.')) {
      if (onDeleteAllChats) {
        onDeleteAllChats();
        toast.success('All chats deleted');
      } else {
        toast.error('Delete chats function not available');
      }
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This will permanently delete all your data including documents, chats, and account information. This cannot be undone.')) {
      if (confirm('This is your last warning. Are you absolutely sure?')) {
        if (onDeleteAccount) {
          onDeleteAccount();
        } else {
          toast.error('Delete account function not available');
        }
      }
    }
  };

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
            
            {/* Password field - show if user has password auth, or blank if OAuth */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Lock size={18} className="text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Password</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {user && !user.avatar ? '••••••••' : 'Not set (Google OAuth)'}
                  </div>
                </div>
              </div>
              {user && !user.avatar ? (
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-xs cursor-pointer transition-all hover:bg-slate-700"
                >
                  Change
                </button>
              ) : (
                <button 
                  disabled
                  className="px-4 py-1.5 bg-slate-800/50 border border-slate-600/50 rounded-md text-slate-500 text-xs cursor-not-allowed"
                >
                  Change
                </button>
              )}
            </div>
          </section>

          {/* Preferences Section */}
          <section className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Preferences
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <Moon size={18} className="text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-100">Theme</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </div>
                </div>
              </div>
              <select 
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-xs cursor-pointer dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 bg-white border-gray-300 text-gray-900"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
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
            
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="mb-3">
                <div className="text-sm font-medium text-slate-100">Documents used</div>
                <div className="text-xs text-slate-400 mt-0.5">{documentCount} of {documentLimit}</div>
              </div>
              
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${storagePercent}%` }}
                ></div>
              </div>
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
              <button 
                onClick={handleDeleteAllChats}
                className="px-4 py-1.5 bg-transparent border border-red-500/30 rounded-md text-red-400 text-xs cursor-pointer transition-all hover:bg-red-500/10 hover:border-red-500/50"
              >
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
              <button 
                onClick={handleDeleteAccount}
                className="px-4 py-1.5 bg-transparent border border-red-500/30 rounded-md text-red-400 text-xs cursor-pointer transition-all hover:bg-red-500/10 hover:border-red-500/50"
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1001] flex items-center justify-center"
          onClick={() => {
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-xl w-[90%] max-w-[400px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-100">Change Password</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-8 h-8 rounded-md bg-transparent border-none text-slate-400 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-100 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-100 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-100 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 text-sm cursor-pointer transition-all hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 border border-indigo-500 rounded-md text-white text-sm cursor-pointer transition-all hover:bg-indigo-700"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

