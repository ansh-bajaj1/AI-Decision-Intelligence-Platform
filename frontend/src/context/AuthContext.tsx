import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('insightiq_token');
      const storedUser = localStorage.getItem('insightiq_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        // Optionally verify token validity by calling /auth/me
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('insightiq_user', JSON.stringify(res.data));
        } catch (err) {
          // Token expired or invalid, clear auth state
          localStorage.removeItem('insightiq_token');
          localStorage.removeItem('insightiq_user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { username, password });
      const { access_token, user: userProfile } = res.data;
      
      localStorage.setItem('insightiq_token', access_token);
      localStorage.setItem('insightiq_user', JSON.stringify(userProfile));
      
      setToken(access_token);
      setUser(userProfile);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/auth/register', { username, email, password });
      // Register successful, auto-login the user
      await login(username, password);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Registration failed. Username or email may already be in use.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed on backend:', err);
    } finally {
      localStorage.removeItem('insightiq_token');
      localStorage.removeItem('insightiq_user');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
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
