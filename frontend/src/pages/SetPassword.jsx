import React, { useState } from 'react';
import { Button } from '../design-system/Button';
import { Card, CardTitle, CardContent } from '../design-system/Card';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2, Mail } from 'lucide-react';
import { t } from '../i18n/translations';

export const SetPassword = ({ onNavigate, onPasswordSet, googleEmail = '', language = 'english' }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { setPassword: setPasswordAuth } = useAuth();
  const L = (key) => t(key, language);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(L('setPassword.errorShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(L('setPassword.errorMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await setPasswordAuth(password);
      setIsSuccess(true);
      // Wait a moment to show success message, then call callback
      setTimeout(() => {
        onPasswordSet?.();
      }, 1500);
    } catch (err) {
      setError(err.message || L('setPassword.errorGeneric'));
    } finally {
      setIsLoading(false);
    }
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
          <ArrowLeft size={16} className="mr-1" /> {L('setPassword.backHome')}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md" hover={false}>
          {isSuccess ? (
            /* Success State */
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="text-success" size={32} />
              </div>
              <CardTitle className="text-xl">{L('setPassword.successTitle')}</CardTitle>
              <p className="text-sm text-text-muted">
                {L('setPassword.successDesc')}
              </p>
            </CardContent>
          ) : (
            /* Form State */
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-text-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-text-primary" size={24} />
                </div>
                <CardTitle className="text-xl mb-1">{L('setPassword.title')}</CardTitle>

                {/* Show the Google account email */}
                {googleEmail && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-text-muted">
                    <Mail size={14} />
                    <span>{L('setPassword.settingUp')} <strong className="text-text-primary">{googleEmail}</strong></span>
                  </div>
                )}

                <p className="text-sm text-text-muted mt-2">
                  {L('setPassword.desc')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">
                    {L('setPassword.passwordLabel')}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={L('setPassword.passwordPlaceholder')}
                      className="w-full bg-surface rounded-lg pl-10 pr-10 py-2.5 text-sm text-surface-text placeholder-surface-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong"
                      autoComplete="new-password"
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

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">
                    {L('setPassword.confirmLabel')}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={L('setPassword.confirmPlaceholder')}
                      className="w-full bg-surface rounded-lg pl-10 pr-4 py-2.5 text-sm text-surface-text placeholder-surface-text-muted focus:outline-none focus:ring-1 focus:ring-border-strong"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

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
                    <><Loader2 size={16} className="animate-spin mr-2" /> {L('setPassword.submitting')}</>
                  ) : (
                    L('setPassword.submit')
                  )}
                </Button>
              </form>

              {/* Retry link — go back to Google sign-in */}
              <div className="text-center mt-4">
                <button
                  onClick={() => onNavigate('auth')}
                  className="text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  {L('setPassword.tryGoogleAgain')}
                </button>
              </div>

              {/* Info text */}
              <p className="text-xs text-text-muted text-center mt-2">
                {L('setPassword.infoText')}
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SetPassword;
