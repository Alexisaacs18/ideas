import { useState } from 'react';
import { Mail, Lock, User as UserIcon, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';

export default function Auth({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when switching between sign-in and sign-up
  const handleModeSwitch = (newMode) => {
    setIsSignUp(newMode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
  };

  if (!isOpen) return null;

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Trim and validate input (username or email)
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      setError('Username or email is required');
      setIsLoading(false);
      return;
    }
    
    if (trimmedEmail.length < 8) {
      setError('Username or email must be at least 8 characters');
      setIsLoading(false);
      return;
    }
    
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }
    
    // Password confirmation validation (signup only)
    if (isSignUp) {
      if (!confirmPassword) {
        setError('Please confirm your password');
        setIsLoading(false);
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      
      // Password complexity validation (signup only)
      const hasCapital = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      
      if (!hasCapital || !hasLowercase || !hasNumber || !hasSymbol) {
        setError('Password must contain at least one capital letter, lowercase letter, number, and symbol');
        setIsLoading(false);
        return;
      }
    }
    
    try {
      let userData;
      
      // Use lowercase for email-style inputs, but allow usernames as-is
      const loginIdentifier = trimmedEmail.includes('@') 
        ? trimmedEmail.toLowerCase() 
        : trimmedEmail;
      
      if (isSignUp) {
        // Sign up - transfer anonymous data
        const anonymousUserId = localStorage.getItem('userId');
        userData = await api.signup(loginIdentifier, password, name || undefined, anonymousUserId);
      } else {
        // Login - should NEVER create accounts or transfer data, only validate
        userData = await api.login(loginIdentifier, password);
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


  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-surface border border-border rounded-2xl p-10 w-[90%] max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">Prosey</h1>
          </div>
          
          {/* Mode Tabs */}
          <div className="flex gap-2 bg-background/50 p-1 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => handleModeSwitch(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isSignUp
                  ? 'bg-indigo-500 text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary'
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
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>
          
          <p className="text-sm text-text-secondary">
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
            <div className="flex items-center gap-3 px-4 py-3 bg-background/50 border border-border rounded-lg focus-within:border-indigo-500/50 transition-colors">
              <UserIcon size={18} className="text-text-secondary flex-shrink-0" />
              <input
                type="text"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-secondary"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3 bg-background/50 border border-border rounded-lg focus-within:border-indigo-500/50 transition-colors">
            <Mail size={18} className="text-text-secondary flex-shrink-0" />
            <input
              type="text"
              placeholder="Username or Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-secondary"
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-background/50 border border-border rounded-lg focus-within:border-indigo-500/50 transition-colors">
            <Lock size={18} className="text-text-secondary flex-shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-secondary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-text-secondary hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff size={18} className="flex-shrink-0" />
              ) : (
                <Eye size={18} className="flex-shrink-0" />
              )}
            </button>
          </div>

          {isSignUp && (
            <div className="flex items-center gap-3 px-4 py-3 bg-background/50 border border-border rounded-lg focus-within:border-indigo-500/50 transition-colors">
              <Lock size={18} className="text-text-secondary flex-shrink-0" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-secondary"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-text-secondary hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} className="flex-shrink-0" />
                ) : (
                  <Eye size={18} className="flex-shrink-0" />
                )}
              </button>
            </div>
          )}

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
        </form>
      </div>
    </div>
  );
}

