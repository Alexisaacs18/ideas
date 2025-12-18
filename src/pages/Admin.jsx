import { useState, useEffect } from 'react';
import { Chrome, Loader2, LogOut, Users, FileText, MessageSquare, TrendingUp, Shield } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';

const ADMIN_EMAIL = 'alexisaacs18@gmail.com';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [oauthClientId, setOauthClientId] = useState(null);

  // Debug: Log when Admin component mounts
  useEffect(() => {
    console.log('Admin component mounted at path:', window.location.pathname);
    loadOAuthClientId();
  }, []);

  const loadOAuthClientId = async () => {
    // Try to get Client ID from environment variable first (for local dev)
    let clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    
    // If not set, try to fetch from backend API (for production)
    if (!clientId || clientId === 'your-google-oauth-client-id-here') {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hidden-grass-22b6.alexisaacs18.workers.dev'}/api/config/oauth-client-id`);
        if (response.ok) {
          const data = await response.json();
          clientId = data.clientId;
        }
      } catch (err) {
        console.error('Failed to load OAuth Client ID from backend:', err);
      }
    }
    
    setOauthClientId(clientId);
    console.log('Google OAuth Client ID:', clientId ? 'Set' : 'Not set');
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load stats when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
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

  const handleGoogleAuth = async () => {
    // Use the loaded Client ID (from env var or API)
    const clientId = oauthClientId || import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    
    if (!clientId || clientId === 'your-google-oauth-client-id-here') {
      toast.error('Google OAuth not configured. Please set GOOGLE_OAUTH_CLIENT_ID in Cloudflare secrets.');
      return;
    }

    setIsAuthLoading(true);

    try {
      // Google OAuth configuration
      // Use the current origin + /admin as redirect URI
      // Ensure no trailing slash on origin
      const origin = window.location.origin.replace(/\/$/, '');
      const redirectUri = `${origin}/admin`;
      const scope = 'openid email profile';
      
      // Log to console for debugging
      console.log('Admin OAuth Redirect URI:', redirectUri);
      console.log('Current origin:', window.location.origin);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope,
        access_type: 'offline',
        prompt: 'consent',
      })}`;

      // Handle OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        toast.error(`OAuth error: ${error}`);
        window.history.replaceState({}, document.title, '/admin');
        setIsAuthLoading(false);
        return;
      }

      if (code) {
        // Exchange code for token and verify email
        // Pass is_admin flag to backend
        const result = await api.oauthCallback(code, redirectUri, null, true);
        
        // Verify email is admin email (backend should have already checked, but double-check)
        if (result.email && result.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          // Store admin session
          localStorage.setItem('admin_session', JSON.stringify({
            email: result.email,
            timestamp: Date.now(),
          }));
          setIsAuthenticated(true);
          toast.success('Admin access granted');
          // Clean URL
          window.history.replaceState({}, document.title, '/admin');
        } else {
          toast.error('Access denied. Only authorized administrators can access this page.');
          setIsAuthenticated(false);
        }
        setIsAuthLoading(false);
        return;
      }

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('Auth error:', err);
      toast.error(err.message || 'Authentication failed');
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
      
      if (!response.ok) {
        throw new Error('Failed to load stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      toast.error('Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Use the loaded Client ID (from env var or API)
  const clientId = oauthClientId || import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  const hasGoogleOAuth = clientId && clientId !== 'your-google-oauth-client-id-here';
  
  console.log('Admin render state:', {
    isLoading,
    isAuthenticated,
    hasGoogleOAuth,
    clientId: clientId ? 'Set' : 'Not set',
    oauthClientId: oauthClientId ? 'Loaded from API' : 'Not loaded'
  });

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
            <p className="text-text-secondary mb-4">Sign in with Google to access admin features</p>
            {!hasGoogleOAuth && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4 text-left">
                <p className="font-medium mb-1">⚠️ Google OAuth not configured</p>
                <p className="text-amber-300/80 mb-2">
                  Please set VITE_GOOGLE_OAUTH_CLIENT_ID in your .env file to enable authentication.
                </p>
                <p className="text-amber-300/60 text-[10px] mt-2">
                  Create a .env file in the project root with: VITE_GOOGLE_OAUTH_CLIENT_ID=your-client-id-here
                </p>
              </div>
            )}
          </div>
          
          {hasGoogleOAuth ? (
            <button
              onClick={handleGoogleAuth}
              disabled={isAuthLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 shadow-sm"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Chrome className="w-5 h-5" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-center p-4 bg-background/50 rounded-lg border border-border/30">
              <p className="text-sm text-text-secondary mb-2">
                Google OAuth is required to access the admin dashboard.
              </p>
              <p className="text-xs text-text-secondary/60">
                Please configure VITE_GOOGLE_OAUTH_CLIENT_ID in your .env file.
              </p>
            </div>
          )}
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
        ) : stats ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Total Users</span>
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-3xl font-bold text-text-primary">{stats.totals.totalUsers}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {stats.totals.signedInUsers} signed in, {stats.totals.anonymousUsers} anonymous
                </p>
              </div>

              <div className="glass p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Total Documents</span>
                  <FileText className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-text-primary">{stats.totals.totalDocuments}</p>
              </div>

              <div className="glass p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Total Chats</span>
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-text-primary">{stats.totals.totalChats}</p>
              </div>

              <div className="glass p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Avg Chats/Day</span>
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-text-primary">
                  {stats.totals.averageChatsPerDay.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Users Table */}
            <div className="glass rounded-xl border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <h2 className="text-xl font-semibold text-text-primary">Users</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {stats.users.length} total users
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
                    {stats.users.map((user, idx) => (
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
                          <span className="text-sm text-text-primary">{user.documentCount}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-primary">{user.totalChats}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-text-primary">
                            {user.averageChatsPerDay.toFixed(1)}
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
                    ))}
                  </tbody>
                  <tfoot className="bg-background/50 border-t-2 border-border/50">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-primary">Totals</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-primary">
                          {stats.totals.totalDocuments}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-primary">
                          {stats.totals.totalChats}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-primary">
                          {stats.totals.averageChatsPerDay.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-secondary">
                          {stats.totals.signedInUsers} signed in, {stats.totals.anonymousUsers} anonymous
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-text-secondary">No statistics available</p>
          </div>
        )}
      </div>
    </div>
  );
}

