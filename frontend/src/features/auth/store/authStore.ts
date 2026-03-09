import { createContext, createElement, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { User } from '../../../types/user';

type AuthContextValue = {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hasAdminRole = normalizedEmail.includes('admin');
    const hasGmRole = normalizedEmail.includes('gm') || hasAdminRole;
    const user: User = {
      id: hasAdminRole ? 'user-admin-1' : hasGmRole ? 'user-gm-1' : 'user-player-1',
      email: normalizedEmail,
      displayName: hasAdminRole ? 'Admin Mock' : hasGmRole ? 'MJ Mock' : 'Joueur Mock',
      roles: hasAdminRole ? ['admin', 'gm'] : hasGmRole ? ['gm'] : ['player'],
      isEmailVerified: true,
      createdAt: new Date().toISOString()
    };

    setCurrentUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      login,
      logout
    }),
    [currentUser, login, logout]
  );

  return createElement(AuthContext.Provider, { value }, children);
}
