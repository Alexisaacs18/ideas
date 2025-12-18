import { useState, useEffect } from 'react';
import { Lock, Loader2, LogOut, Users, FileText, MessageSquare, TrendingUp, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ADMIN_PASSWORD = 'S3ahawk-1845!';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load stats when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    } else {
      // Initialize with empty stats so table structure shows
      setStats({
        users: [],
        totals: {
          totalUsers: 0,
          signedInUsers: 0,
          anonymousUsers: 0,
          totalDocuments: 0,
          totalChats: 0,
          averageChatsPerDay: 0,
        }
      });
    }
  }, [isAuthenticated]);

  const checkAuth = () => {
    try {
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          // Check if session is still valid (24 hours)
          if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('admin_session');
            setIsAuthenticated(false);
          }
        } catch (e) {
          console.error('Error parsing admin session:', e);
          localStorage.removeItem('admin_session');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsAuthLoading(true);

    try {
      // Check password
      if (password === ADMIN_PASSWORD) {
        // Store admin session
        localStorage.setItem('admin_session', JSON.stringify({
          timestamp: Date.now(),
        }));
        setIsAuthenticated(true);
        setPassword('');
        toast.success('Admin access granted');
      } else {
        setError('Incorrect password');
        toast.error('Incorrect password');
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('Authentication failed');
      setError('Authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('admin_session');
    setIsAuthenticated(false);
    setStats(null);
    toast.success('Signed out');
  };

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hidden-grass-22b6.alexisaacs18.workers.dev'}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session')}`,
        },
      });
      
      console.log('Admin stats response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Admin stats error response:', errorText);
        throw new Error(`Failed to load stats: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Admin stats data received:', data);
      console.log('Users count:', data.users?.length || 0);
      console.log('Totals:', data.totals);
      
      if (!data.users || !data.totals) {
        console.error('Invalid data structure:', data);
        throw new Error('Invalid response format');
      }
      
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      console.error('Error details:', err.message, err.stack);
      toast.error(`Failed to load statistics: ${err.message}`);
    } finally {
      setIsLoadingStats(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full glass p-8 rounded-2xl border border-border/50">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 mx-auto mb-4 text-indigo-500" />
            <h1 className="text-2xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
            <p className="text-text-secondary mb-4">Enter password to access admin features</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            
            <div className="flex items-center gap-3 px-4 py-3 bg-background/50 border border-border/50 rounded-lg focus-within:border-indigo-500/50 transition-colors">
              <Lock size={18} className="text-text-secondary flex-shrink-0" />
              <input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={isAuthLoading}
                className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-secondary"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading || !password.trim()}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
              <p className="text-sm text-text-secondary mt-1">User statistics and analytics</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-surface/50 transition-colors text-text-secondary hover:text-text-primary"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoadingStats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Total Users</span>
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-3xl font-bold text-text-primary">
                  {stats?.totals?.totalUsers ?? 0}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {stats?.totals?.signedInUsers ?? 0} signed in, {stats?.totals?.anonymousUsers ?? 0} anonymous
                </p>
              </div>

              <div className="glass p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Total Documents</span>
                  <FileText className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-text-primary">
                  {stats?.totals?.totalDocuments ?? 0}
                </p>
              </div>

              <div className="glass p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Total Chats</span>
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-text-primary">
                  {stats?.totals?.totalChats ?? 0}
                </p>
              </div>

              <div className="glass p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Avg Chats/Day</span>
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-text-primary">
                  {(stats?.totals?.averageChatsPerDay ?? 0).toFixed(1)}
                </p>
              </div>
            </div>

            {/* Users Table */}
            <div className="glass rounded-xl border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <h2 className="text-xl font-semibold text-text-primary">Users</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {stats?.users?.length ?? 0} total users
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background/50 border-b border-border/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        User ID / Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Documents
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Total Chats
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Avg Chats/Day
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {stats?.users && stats.users.length > 0 ? (
                      stats.users.map((user, idx) => (
                        <tr key={user.user_id || idx} className="hover:bg-background/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-text-primary">
                              {user.email || user.user_id}
                            </div>
                            {user.email && (
                              <div className="text-xs text-text-secondary mt-1">
                                {user.user_id}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-text-primary">{user.documentCount ?? 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-text-primary">{user.totalChats ?? 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-text-primary">
                              {(user.averageChatsPerDay ?? 0).toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              user.email 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {user.email ? 'Signed In' : 'Anonymous'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <p className="text-text-secondary">No users found</p>
                          <p className="text-xs text-text-secondary/60 mt-2">
                            Users will appear here once they interact with the app
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-background/50 border-t-2 border-border/50">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-primary">Totals</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-primary">
                          {stats?.totals?.totalDocuments ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-primary">
                          {stats?.totals?.totalChats ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-primary">
                          {(stats?.totals?.averageChatsPerDay ?? 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-secondary">
                          {stats?.totals?.signedInUsers ?? 0} signed in, {stats?.totals?.anonymousUsers ?? 0} anonymous
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

