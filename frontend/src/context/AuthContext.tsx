import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import { tokenStorage, onAuthExpired } from '../api/client';
import type { User, Wallet } from '../types';

interface AuthContextType {
  user: User | null;
  wallets: Wallet[];
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSetupPin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [hasSetupPin, setHasSetupPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await authApi.getMe();
      setUser({
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
        hasSetupPin: profile.hasSetupPin,
      });
      setWallets(profile.wallets || []);
      setHasSetupPin(Boolean(profile.hasSetupPin));
    } catch {
      // Failed to load profile (e.g. token expired)
      tokenStorage.clear();
      setUser(null);
      setWallets([]);
      setHasSetupPin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = tokenStorage.get();
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }

    // Subscribe to centralized 401 events
    const unsubscribe = onAuthExpired(() => {
      setUser(null);
      setWallets([]);
      setHasSetupPin(false);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      tokenStorage.set(response.accessToken);
      await fetchProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, fullName: string, password: string) => {
    setIsLoading(true);
    try {
      await authApi.register({ email, fullName, password });
      // Auto login after successful registration for smooth UX
      const loginRes = await authApi.login({ email, password });
      tokenStorage.set(loginRes.accessToken);
      await fetchProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors and proceed to wipe frontend session
    } finally {
      tokenStorage.clear();
      setUser(null);
      setWallets([]);
      setHasSetupPin(false);
    }
  };

  const setupPin = async (pin: string) => {
    await authApi.setupPin(pin);
    setHasSetupPin(true);
    await fetchProfile();
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallets,
        isAuthenticated: Boolean(user && tokenStorage.get()),
        isLoading,
        hasSetupPin,
        login,
        register,
        logout,
        setupPin,
        refreshProfile,
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
