import { useState } from 'react';
import { Mail, Lock, User as UserIcon, Chrome, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';

export default function Auth({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when switching between sign-in and sign-up
  const handleModeSwitch = (newMode) => {
    setIsSignUp(newMode);
    setEmail('');
    setPassword('');
    setName('');
    setError('');
  };

  // Check if Google OAuth is configured
  const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID && 
                              import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID !== 'your-google-oauth-client-id-here';

  if (!isOpen) return null;

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Validate email format on frontend
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setError('Email is required');
      setIsLoading(false);
      return;
    }
    
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }
    
    try {
      let userData;
      
      if (isSignUp) {
        // Sign up - transfer anonymous data
        const anonymousUserId = localStorage.getItem('userId');
        userData = await api.signup(trimmedEmail, password, name || undefined, anonymousUserId);
      } else {
        // Login - should NEVER create accounts or transfer data, only validate
        userData = await api.login(trimmedEmail, password);
      }
      
      // Format user data for onAuthSuccess
      const formattedUserData = {
        id: userData.user_id,
        user_id: userData.user_id,
        email: userData.email,
        name: userData.name || email.split('@')[0],
        avatar: null,
      };
      
      // Pass isSignUp flag so frontend knows whether to clear or keep chats
      onAuthSuccess(formattedUserData, isSignUp);
    } catch (err) {
      const errorMessage = err.message || (isSignUp ? 'Signup failed' : 'Login failed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET; // Optional for frontend-only flow
    
    if (!clientId || clientId === 'your-google-oauth-client-id-here') {
      console.warn('Google OAuth Client ID not configured. OAuth sign-in is disabled.');
      // Don't show alert - just silently disable OAuth button
      // Users can still use email/password or continue as anonymous
      return;
    }

    // Google OAuth configuration
    const redirectUri = window.location.origin;
    const scope = 'openid email profile';
    const responseType = 'code';
    
    // Build Google OAuth URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    // Redirect to Google OAuth
    window.location.href = authUrl;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl p-10 w-[90%] max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center">
              <span className="text-white font-bold text-2xl">SB</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-100">Prosey</h1>
          </div>
          
          {/* Mode Tabs */}
          <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => handleModeSwitch(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isSignUp
                  ? 'bg-indigo-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isSignUp
                  ? 'bg-indigo-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>
          
          <p className="text-sm text-slate-400">
            {isSignUp ? 'Create a new account to get started' : 'Sign in to your account'}
          </p>
        </div>

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleEmailAuth}>
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          
          {isSignUp && (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg focus-within:border-indigo-500/50 transition-colors">
              <UserIcon size={18} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-slate-100 text-sm placeholder:text-slate-500"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg focus-within:border-indigo-500/50 transition-colors">
            <Mail size={18} className="text-slate-400 flex-shrink-0" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-slate-100 text-sm placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg focus-within:border-indigo-500/50 transition-colors">
            <Lock size={18} className="text-slate-400 flex-shrink-0" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-slate-100 text-sm placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </button>

          {googleOAuthEnabled && (
            <>
              <div className="flex items-center gap-4 text-slate-400 text-xs my-2">
                <div className="flex-1 h-px bg-slate-700"></div>
                <span>or</span>
                <div className="flex-1 h-px bg-slate-700"></div>
              </div>

              <button
                type="button"
                className="w-full py-3 rounded-lg bg-transparent border border-slate-700 text-slate-100 text-sm font-medium cursor-pointer transition-all hover:bg-slate-800 flex items-center justify-center gap-2"
                onClick={handleGoogleAuth}
              >
                <Chrome size={18} />
                Continue with Google
              </button>
            </>
          )}

        </form>
      </div>
    </div>
  );
}

