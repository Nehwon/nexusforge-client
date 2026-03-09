import { createContext, createElement, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { loadCurrentUserService, loginService, logoutService } from '../../../services/authService';
import { User } from '../../../types/user';

type AuthContextValue = {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function hydrateCurrentUser() {
      try {
        const user = await loadCurrentUserService();
        if (isMounted) {
          setCurrentUser(user);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    void hydrateCurrentUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis.');
    }

    const user = await loginService(email, password);
    setCurrentUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    void logoutService();
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isLoading,
      login,
      logout
    }),
    [currentUser, isLoading, login, logout]
  );

  return createElement(AuthContext.Provider, { value }, children);
}
