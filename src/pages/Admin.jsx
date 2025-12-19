import { useState, useEffect, useMemo } from 'react';
import { Lock, Loader2, LogOut, Users, FileText, MessageSquare, TrendingUp, Shield, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../utils/api';

const ADMIN_PASSWORD = 'S3ahawk-1845!';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Table controls
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('documents'); // 'documents', 'chats', 'avgChats', 'status', 'email'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'signedIn', 'anonymous'
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [clearingR2, setClearingR2] = useState(false);

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
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hidden-grass-22b6.alexisaacs18.workers.dev';
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Admin stats response status:', response.status);
      console.log('Admin stats response ok:', response.ok);
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
          console.error('Admin stats error response:', errorText);
        } catch (e) {
          errorText = `HTTP ${response.status}`;
        }
        
        // Handle specific status codes
        if (response.status === 500) {
          throw new Error('Server error. Please try again in a moment.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Access denied. Please sign in again.');
        }
        throw new Error(`Unable to load statistics: ${errorText}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        throw new Error('Invalid response from server. Please try again.');
      }
      
      console.log('Admin stats data received:', data);
      console.log('Users count:', data.users?.length || 0);
      console.log('Totals:', data.totals);
      
      if (!data.users || !data.totals) {
        console.error('Invalid data structure:', data);
        // Initialize with empty data instead of throwing
        setStats({
          users: [],
          totals: {
            totalUsers: 0,
            signedInUsers: 0,
            anonymousUsers: 0,
            totalDocuments: 0,
            totalChats: 0,
            averageChatsPerDay: 0,
            activeUsers: 0,
          }
        });
        toast.error('Received incomplete data. Showing empty table.');
        return;
      }
      
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      console.error('Error details:', err.message, err.stack);
      
      // Check if it's a network error
      if (err.message.includes('Failed to fetch') || 
          err.message.includes('NetworkError') || 
          err.name === 'TypeError') {
        toast.error('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        toast.error(err.message || 'Failed to load statistics. Please try again.');
      }
      
      // Set empty stats so table structure still shows
      setStats({
        users: [],
        totals: {
          totalUsers: 0,
          signedInUsers: 0,
          anonymousUsers: 0,
          totalDocuments: 0,
          totalChats: 0,
          averageChatsPerDay: 0,
          activeUsers: 0,
        }
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Format last activity timestamp
  const formatLastActivity = (timestamp) => {
    if (!timestamp) return 'Never';
    
    // timestamp is in seconds (unix timestamp), convert to milliseconds
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // For older dates, show formatted date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Filter, sort, and search users
  const filteredAndSortedUsers = useMemo(() => {
    if (!stats?.users) return [];

    let filtered = [...stats.users];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => {
        const email = (user.email || '').toLowerCase();
        const userId = (user.user_id || '').toLowerCase();
        return email.includes(query) || userId.includes(query);
      });
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => {
        const isSignedIn = !!user.email;
        return filterStatus === 'signedIn' ? isSignedIn : !isSignedIn;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'documents':
          aValue = a.documentCount || 0;
          bValue = b.documentCount || 0;
          break;
        case 'chats':
          aValue = a.totalChats || 0;
          bValue = b.totalChats || 0;
          break;
        case 'avgChats':
          aValue = a.averageChatsPerDay || 0;
          bValue = b.averageChatsPerDay || 0;
          break;
        case 'status':
          aValue = a.email ? 1 : 0; // Signed in = 1, anonymous = 0
          bValue = b.email ? 1 : 0;
          break;
        case 'email':
          aValue = (a.email || a.user_id || '').toLowerCase();
          bValue = (b.email || b.user_id || '').toLowerCase();
          break;
        case 'lastActivity':
          aValue = a.lastActivity || 0;
          bValue = b.lastActivity || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return filtered;
  }, [stats?.users, searchQuery, filterStatus, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to desc
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-text-secondary/40" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-indigo-400" />
      : <ArrowDown className="w-3 h-3 ml-1 text-indigo-400" />;
  };

  const handleDeleteUser = async (userId) => {
    if (showDeleteConfirm !== userId) {
      setShowDeleteConfirm(userId);
      return;
    }

    setDeletingUserId(userId);
    try {
      const result = await api.deleteUser(userId);
      toast.success(`User deleted successfully. ${result.deletedDocuments} documents and ${result.deletedFiles} files removed.`);
      setShowDeleteConfirm(null);
      // Reload stats
      await loadStats();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
      setShowDeleteConfirm(null);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleClearR2Documents = async () => {
    if (!window.confirm('⚠️ WARNING: This will delete ALL documents from R2 storage. This action is IRREVERSIBLE!\n\nAre you sure you want to continue?')) {
      return;
    }

    setClearingR2(true);
    try {
      const result = await api.clearR2Documents();
      toast.success(`R2 cleared: ${result.deletedCount} files deleted.`);
    } catch (error) {
      toast.error(error.message || 'Failed to clear R2 documents');
    } finally {
      setClearingR2(false);
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearR2Documents}
                disabled={clearingR2}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearingR2 ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Clear R2 Documents</span>
                  </>
                )}
              </button>
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
                  {stats?.totals?.activeUsers !== undefined && (
                    <span className="ml-2 text-indigo-400">
                      • {stats.totals.activeUsers} active (30d)
                    </span>
                  )}
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">Users</h2>
                    <p className="text-sm text-text-secondary mt-1">
                      {filteredAndSortedUsers.length} of {stats?.users?.length ?? 0} user records
                      {stats?.totals && (
                        <span className="ml-2 text-xs text-text-secondary/60">
                          ({stats.totals.signedInUsers} signed-in users, {stats.totals.anonymousUsers} anonymous sessions)
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1 sm:min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
                      <input
                        type="text"
                        placeholder="Search by email or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/50 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                    
                    {/* Status Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary/60" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="pl-10 pr-8 py-2 bg-background/50 border border-border/50 rounded-lg text-sm text-text-primary focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="all">All Users</option>
                        <option value="signedIn">Signed In</option>
                        <option value="anonymous">Anonymous</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-text-secondary/60">
                  Note: Anonymous users are tracked by browser session. Clearing browser data creates a new session.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-background/50 border-b border-border/50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-background/30 transition-colors"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center">
                          User (Email or Session ID)
                          {getSortIcon('email')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-background/30 transition-colors"
                        onClick={() => handleSort('documents')}
                      >
                        <div className="flex items-center">
                          Documents
                          {getSortIcon('documents')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-background/30 transition-colors"
                        onClick={() => handleSort('chats')}
                      >
                        <div className="flex items-center">
                          Total Chats
                          {getSortIcon('chats')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-background/30 transition-colors"
                        onClick={() => handleSort('avgChats')}
                      >
                        <div className="flex items-center">
                          Avg Chats/Day
                          {getSortIcon('avgChats')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-background/30 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-background/30 transition-colors"
                        onClick={() => handleSort('lastActivity')}
                      >
                        <div className="flex items-center">
                          Last Activity
                          {getSortIcon('lastActivity')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredAndSortedUsers.length > 0 ? (
                      filteredAndSortedUsers.map((user, idx) => (
                        <tr key={user.user_id || idx} className="hover:bg-background/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-text-primary">
                            {user.email || `Session: ${user.user_id.substring(0, 8)}...`}
                          </div>
                          {user.email ? (
                            <div className="text-xs text-text-secondary mt-1">
                              ID: {user.user_id.substring(0, 8)}...
                            </div>
                          ) : (
                            <div className="text-xs text-text-secondary mt-1">
                              Anonymous (clearing browser data creates new session)
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-text-secondary/60" />
                              <span className="text-sm text-text-primary">
                                {formatLastActivity(user.lastActivity)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {showDeleteConfirm === user.user_id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeleteUser(user.user_id)}
                                  disabled={deletingUserId === user.user_id}
                                  className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deletingUserId === user.user_id ? (
                                    <Loader2 className="w-3 h-3 animate-spin inline" />
                                  ) : (
                                    'Confirm'
                                  )}
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  disabled={deletingUserId === user.user_id}
                                  className="px-3 py-1 text-xs bg-background/50 hover:bg-background/70 text-text-primary rounded transition-colors disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(user.user_id)}
                                disabled={deletingUserId !== null}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete user and all their data"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <p className="text-text-secondary">
                            {searchQuery || filterStatus !== 'all' 
                              ? 'No users match your filters' 
                              : 'No users found'}
                          </p>
                          <p className="text-xs text-text-secondary/60 mt-2">
                            {searchQuery || filterStatus !== 'all' 
                              ? 'Try adjusting your search or filter criteria'
                              : 'Users will appear here once they interact with the app'}
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
                          {stats?.totals?.activeUsers !== undefined && (
                            <span className="ml-2 text-indigo-400">
                              • {stats.totals.activeUsers} active (30d)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-secondary">
                          —
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-text-secondary">
                          —
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

