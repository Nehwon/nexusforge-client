import { User } from '../types/user';
import {
  ApiError,
  apiClient,
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  isBackendEnabled,
  persistTokens,
  requestJson
} from './apiClient';

type AuthLoginResponse = {
  token: string;
  refreshToken?: string;
  user: User;
};

type AuthMeResponse = {
  user: User;
};

function buildMockUser(email: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  const hasAdminRole = normalizedEmail.includes('admin');
  const hasGmRole = normalizedEmail.includes('gm') || hasAdminRole;
  return {
    id: hasAdminRole ? 'user-admin-1' : hasGmRole ? 'user-gm-1' : 'user-player-1',
    email: normalizedEmail,
    displayName: hasAdminRole ? 'Admin Mock' : hasGmRole ? 'MJ Mock' : 'Joueur Mock',
    roles: hasAdminRole ? ['admin', 'gm'] : hasGmRole ? ['gm'] : ['player'],
    isEmailVerified: true,
    createdAt: new Date().toISOString()
  };
}

export async function loginService(email: string, password: string): Promise<User> {
  if (!isBackendEnabled()) {
    const mockUser = buildMockUser(email);
    persistTokens({ accessToken: `mock-token-${mockUser.id}`, refreshToken: `mock-refresh-${mockUser.id}` });
    return apiClient(mockUser, 120);
  }

  const payload = await requestJson<AuthLoginResponse>({
    path: '/api/auth/login',
    method: 'POST',
    withAuth: false,
    body: {
      email,
      password
    }
  });

  persistTokens({ accessToken: payload.token, refreshToken: payload.refreshToken ?? null });
  return payload.user;
}

export async function loadCurrentUserService(): Promise<User | null> {
  const token = getAccessToken();
  if (!token) {
    return null;
  }

  if (!isBackendEnabled()) {
    const userId = token.includes('user-gm-1') ? 'user-gm-1' : token.includes('user-admin-1') ? 'user-admin-1' : 'user-player-1';
    return {
      id: userId,
      email: userId === 'user-player-1' ? 'player@mock.local' : userId === 'user-admin-1' ? 'admin@mock.local' : 'gm@mock.local',
      displayName: userId === 'user-player-1' ? 'Joueur Mock' : userId === 'user-admin-1' ? 'Admin Mock' : 'MJ Mock',
      roles: userId === 'user-player-1' ? ['player'] : userId === 'user-admin-1' ? ['admin', 'gm'] : ['gm'],
      isEmailVerified: true,
      createdAt: new Date().toISOString()
    };
  }

  try {
    const payload = await requestJson<AuthMeResponse>({
      path: '/api/auth/me',
      method: 'GET',
      withAuth: true
    });
    return payload.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearStoredTokens();
        return null;
      }

      try {
        const refresh = await requestJson<{ token: string; refreshToken?: string }>({
          path: '/api/auth/refresh',
          method: 'POST',
          withAuth: false,
          body: { refreshToken }
        });
        persistTokens({ accessToken: refresh.token, refreshToken: refresh.refreshToken ?? refreshToken });
        const retried = await requestJson<AuthMeResponse>({ path: '/api/auth/me', method: 'GET', withAuth: true });
        return retried.user;
      } catch {
        clearStoredTokens();
        return null;
      }
    }

    throw error;
  }
}

export async function logoutService(): Promise<void> {
  const refreshToken = getRefreshToken();

  if (isBackendEnabled()) {
    try {
      await requestJson<void>({
        path: '/api/auth/logout',
        method: 'POST',
        withAuth: true,
        body: refreshToken ? { refreshToken } : {}
      });
    } catch {
      // noop: always clear local auth state.
    }
  }

  clearStoredTokens();
}
