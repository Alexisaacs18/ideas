import { useState } from 'react';
import { Mail, Lock, User as UserIcon, Chrome } from 'lucide-react';

export default function Auth({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Check if Google OAuth is configured
  const googleOAuthEnabled = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID && 
                              import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID !== 'your-google-oauth-client-id-here';

  if (!isOpen) return null;

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    
    // TODO: Implement actual auth with backend
    const userData = {
      id: Date.now().toString(),
      email,
      name: name || email.split('@')[0],
      avatar: null,
      createdAt: new Date().toISOString()
    };
    
    // Store in localStorage for now
    localStorage.setItem('user', JSON.stringify(userData));
    
    onAuthSuccess(userData);
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
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center">
              <span className="text-white font-bold text-2xl">SB</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-100">Second Brain</h1>
          </div>
          <p className="text-sm text-slate-400">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleEmailAuth}>
          {isSignUp && (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg focus-within:border-indigo-500/50 transition-colors">
              <UserIcon size={18} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-slate-100 text-sm placeholder:text-slate-500"
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
              className="flex-1 bg-transparent border-none outline-none text-slate-100 text-sm placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 border-none text-white text-sm font-medium cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
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

          <button
            type="button"
            className="bg-transparent border-none text-indigo-400 text-xs cursor-pointer py-2 hover:underline"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}

