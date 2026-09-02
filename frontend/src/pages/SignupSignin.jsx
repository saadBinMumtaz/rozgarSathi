import React, { useState } from 'react';
import { Button } from '../design-system/Button';
import { Card, CardTitle, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export const SignupSignin = ({ onNavigate, onAuthComplete, guestId }) => {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signin, signup, googleSignIn, completeAuth } = useAuth();

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (!username.trim() || username.trim().length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError('Username can only contain letters, numbers, and underscores.');
        return;
      }
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
        setError('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else {
      if (!username.trim() || !password) {
        setError('Please enter your username and password.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const result = await signup(username.trim(), email.trim(), password, guestId);
        if (result.migratedSessions > 0) {
          // Sessions were migrated — notify user
        }
      } else {
        await signin(username.trim(), password);
      }
      onAuthComplete?.();
    } catch (err) {
      setError(err.message || (mode === 'signup' ? 'Signup failed. Please try again.' : 'Sign in failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (result) => {
    try {
      setError('');
      // googleSignIn is already called inside GoogleSignInButton via apiClient
      // The result contains { token, user, mergedSessions, needsPassword }
      // Note: AuthContext is NOT yet updated — we decide based on needsPassword
      
      // Check if user needs to set a password (new Google OAuth users)
      if (result.needsPassword) {
        // Redirect to Set Password page WITHOUT completing auth yet
        onNavigate?.('set-password');
        return;
      }
      
      // User already has a password — complete authentication
      completeAuth(result.token, result.user);
      
      if (result.mergedSessions > 0) {
        // Sessions were merged — could show a toast here
      }
      onAuthComplete?.();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    }
  };

  const handleGoogleError = (err) => {
    setError(err.message || 'Google sign-in failed. Please try again.');
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col pt-8">
      {/* Back button */}
      <div className="w-full max-w-md mx-auto px-6 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('landing')}
          className="text-text-muted hover:text-text-primary"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Home
        </Button>
      </div>

      {/* Auth Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
      <Card className="w-full max-w-md" hover={false}>
        {/* Tab switcher */}
        <div className="surface-text flex mb-6 bg-surface rounded-lg p-1">
          <button
            onClick={() => switchMode('signin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'signin'
                ? 'bg-text-primary text-bg-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              mode === 'signup'
                ? 'bg-text-primary text-bg-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Sign Up
          </button>
        </div>

        <CardTitle className="text-xl mb-1">
          {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
        </CardTitle>
        <p className="text-sm text-text-muted mb-6">
          {mode === 'signin'
            ? 'Sign in to access your dashboard and track your progress.'
            : 'Sign up to save your progress and unlock personalized insights.'}
        </p>

        {/* Google Sign-In Button — prominently displayed at the top */}
        <div className="mb-4">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            guestId={guestId}
            variant="primary"
            size="lg"
          />
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="surface-text bg-surface-hover px-2 text-text-muted">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">
              {mode === 'signin' ? 'Username or Email' : 'Username'}
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === 'signin' ? 'Enter username or email' : 'Choose a username'}
                className="w-full bg-surface rounded-lg pl-10 pr-4 py-2.5 text-sm text-surface-text placeholder-surface-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong font-mono"
                autoComplete={mode === 'signin' ? 'username' : 'username'}
              />
            </div>
          </div>

          {/* Email (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-surface rounded-lg pl-10 pr-4 py-2.5 text-sm text-surface-text placeholder-surface-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong"
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter password'}
                className="w-full bg-surface rounded-lg pl-10 pr-10 py-2.5 text-sm text-surface-text placeholder-surface-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-surface rounded-lg pl-10 pr-4 py-2.5 text-sm text-surface-text placeholder-surface-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-danger/10 rounded-lg text-xs text-danger">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin mr-2" /> {mode === 'signin' ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </Button>
        </form>

        {/* Footer text */}
        <p className="text-xs text-text-muted text-center mt-4">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => switchMode('signup')} className="text-text-primary font-medium hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => switchMode('signin')} className="text-text-primary font-medium hover:underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </Card>
      </div>
    </div>
  );
};

export default SignupSignin;
