// frontend/src/components/auth/GoogleSignInButton.jsx
// Google Sign-In button component.
// Integrates with Google Identity Services (GIS) for OAuth 2.0 authentication.
// Falls back to a styled button if GIS fails to load.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '../../design-system/Button';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../api/client';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/**
 * Dynamically load the Google Identity Services script if not already present.
 */
const loadGisScript = () => {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    // Check if script tag already exists (avoid duplicates)
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      // Script tag exists but GIS not ready yet — poll for it
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          clearInterval(poll);
          resolve();
        } else if (attempts > 100) {
          clearInterval(poll);
          reject(new Error('GIS script tag exists but API not ready'));
        }
      }, 100);
      return;
    }

    // Inject script tag
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Script loaded — poll for the API to be ready
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          clearInterval(poll);
          resolve();
        } else if (attempts > 100) {
          clearInterval(poll);
          reject(new Error('GIS script loaded but API not ready'));
        }
      }, 100);
    };
    script.onerror = () => reject(new Error('Failed to load GIS script'));
    document.head.appendChild(script);
  });
};

export const GoogleSignInButton = ({ 
  onSuccess, 
  onError, 
  guestId,
  variant = 'primary', 
  size = 'md',
  showIcon = true,
}) => {
  const buttonRef = useRef(null);
  const { googleSignIn } = useAuth();
  const [gisLoaded, setGisLoaded] = useState(false);
  const [gisFailed, setGisFailed] = useState(false);

  // Load GIS script
  useEffect(() => {
    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (!cancelled) setGisLoaded(true);
      })
      .catch((err) => {
        console.warn('[GoogleSignIn] GIS failed to load:', err.message);
        if (!cancelled) setGisFailed(true);
      });

    return () => { cancelled = true; };
  }, []);

  // Initialize GIS and render button once GIS is loaded
  useEffect(() => {
    if (!gisLoaded) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('[GoogleSignIn] VITE_GOOGLE_CLIENT_ID not configured');
      return;
    }

    // Initialize Google Identity Services
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          const result = await googleSignIn(response.credential, guestId);
          if (onSuccess) onSuccess(result);
        } catch (err) {
          console.error('[GoogleSignIn] Verification failed:', err);
          if (onError) onError(err);
        }
      },
    });

    // Render the button
    if (buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: size === 'sm' ? 'medium' : 'large',
        width: 300,
        text: 'signin_with',
        shape: 'rectangular',
      });
    }

    return () => {
      if (buttonRef.current) {
        while (buttonRef.current.firstChild) {
          buttonRef.current.removeChild(buttonRef.current.firstChild);
        }
      }
    };
  }, [guestId, onSuccess, onError, size, googleSignIn, gisLoaded]);

  // Fallback: navigate to backend OAuth endpoint which has the correct redirect_uri registered
  const handleFallbackSignIn = useCallback(() => {
    // Navigate to backend's /api/auth/google which redirects to Google with the correct redirect_uri
    window.location.href = `${API_BASE_URL}/auth/google`;
  }, []);

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  return (
    <div className="w-full">
      {/* Google Identity Services button container */}
      {gisLoaded ? (
        <div ref={buttonRef} className="w-full flex justify-center" />
      ) : gisFailed ? (
        /* Fallback button when GIS fails to load */
        <Button
          variant={variant}
          size={size === 'sm' ? 'sm' : 'lg'}
          onClick={handleFallbackSignIn}
          className="w-full flex items-center justify-center gap-2"
        >
          {showIcon && <GoogleIcon />}
          Sign in with Google
        </Button>
      ) : (
        /* Loading state */
        <div className="w-full flex items-center justify-center py-3 text-sm text-text-muted animate-pulse">
          Loading Google Sign-In...
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;
