import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthToken, setAuthToken, getCurrentUser, type UserProfile } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  updateUser: (newUser: UserProfile) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken: string, newUser: UserProfile) => {
    setAuthToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const updateUser = useCallback((newUser: UserProfile) => {
    setUser(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const activeToken = getAuthToken();
    if (!activeToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await getCurrentUser();
      setUser(profile);
    } catch (err: any) {
      // If token is invalid or expired, clear session
      if (err?.status === 401 || err?.status === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
