import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'rozgar-sathi-auth-token';
const USER_KEY = 'rozgar-sathi-auth-user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [loading, setLoading] = useState(true);

  // Persist auth state
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  // Restore session on mount — verify token is still valid
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const result = await apiClient.getMe();
        if (!cancelled && result.user) {
          setUser(result.user);
        }
      } catch {
        // Token invalid — clear
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signup = useCallback(async (username, email, password, guestId) => {
    const result = await apiClient.signup(username, email, password, guestId);
    setToken(result.token);
    setUser(result.user);
    return result;
  }, []);

  const signin = useCallback(async (username, password) => {
    const result = await apiClient.signin(username, password);
    setToken(result.token);
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, signup, signin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
