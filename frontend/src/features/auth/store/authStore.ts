import { createContext, createElement, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { loadCurrentUserService, LoginResult, loginService, logoutService } from '../../../services/authService';
import { User } from '../../../types/user';

type AuthContextValue = {
  currentUser: User | null;
  isLoading: boolean;
  login: (params: { email: string; password: string; totpCode?: string; challengeToken?: string }) => Promise<LoginResult>;
  reloadCurrentUser: () => Promise<User | null>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reloadCurrentUser = useCallback(async () => {
    const user = await loadCurrentUserService();
    setCurrentUser(user);
    return user;
  }, []);

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

  const login = useCallback(
    async (params: { email: string; password: string; totpCode?: string; challengeToken?: string }) => {
      if (!params.email || !params.password) {
        throw new Error('Email et mot de passe requis.');
      }

      const result = await loginService(params);
      if (result.status === 'authenticated') {
        setCurrentUser(result.user);
      }
      return result;
    },
    []
  );

  const logout = useCallback(() => {
    void logoutService();
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isLoading,
      login,
      reloadCurrentUser,
      logout
    }),
    [currentUser, isLoading, login, reloadCurrentUser, logout]
  );

  return createElement(AuthContext.Provider, { value }, children);
}
