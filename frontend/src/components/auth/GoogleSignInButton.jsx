// frontend/src/components/auth/GoogleSignInButton.jsx
// Google Sign-In button component using the design-system Button.
// Integrates with Google Identity Services for OAuth authentication.

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../design-system/Button';
import { useAuth } from '../../context/AuthContext';

/**
 * Google Sign-In button component.
 * Uses Google Identity Services (GIS) for OAuth 2.0 authentication.
 * 
 * @param {Object} props
 * @param {function} props.onSuccess - Callback when sign-in succeeds (receives { token, user })
 * @param {function} props.onError - Callback when sign-in fails (receives error)
 * @param {string} props.guestId - Optional guest ID to merge sessions after sign-in
 * @param {string} props.variant - Button variant (default: 'primary')
 * @param {string} props.size - Button size (default: 'md')
 * @param {boolean} props.showIcon - Whether to show Google icon (default: true)
 */
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

  // Wait for Google Identity Services to load
  useEffect(() => {
    // Check if already loaded
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    // Poll for GIS script to load (max 5 seconds)
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.id) {
        setGisLoaded(true);
        clearInterval(checkInterval);
      } else if (attempts >= maxAttempts) {
        console.warn('[GoogleSignIn] GIS script failed to load after 5 seconds');
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
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
          // Verify the ID token on the backend and update AuthContext
          const result = await googleSignIn(response.credential, guestId);
          if (onSuccess) {
            onSuccess(result);
          }
        } catch (err) {
          console.error('[GoogleSignIn] Verification failed:', err);
          if (onError) {
            onError(err);
          }
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
      // Cleanup - remove all child nodes safely
      if (buttonRef.current) {
        while (buttonRef.current.firstChild) {
          buttonRef.current.removeChild(buttonRef.current.firstChild);
        }
      }
    };
  }, [guestId, onSuccess, onError, size, googleSignIn, gisLoaded]);

  // Fallback button if Google Identity Services is not available
  const handleFallbackClick = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="w-full">
      {/* Google Identity Services button */}
      {gisLoaded && <div ref={buttonRef} className="w-full" />}
      
      {/* Fallback button if GIS is not loaded */}
      {!gisLoaded ? (
        <Button
          variant={variant}
          size={size}
          onClick={handleFallbackClick}
          className="w-full flex items-center justify-center gap-2"
        >
          {showIcon && (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Sign in with Google
        </Button>
      ) : null}
    </div>
  );
};

export default GoogleSignInButton;
