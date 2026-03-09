import { User } from '../types/user';
import {
  ApiError,
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  persistTokens,
  requestJson
} from './apiClient';

type AuthLoginSuccessResponse = {
  token: string;
  refreshToken?: string;
  user: User;
};

type AuthLoginTwoFactorResponse = {
  requiresTwoFactor: true;
  challengeToken: string;
  methods: string[];
};

type AuthMeResponse = {
  user: User;
};

export type LoginResult =
  | {
      status: 'authenticated';
      user: User;
    }
  | {
      status: 'requires_2fa';
      challengeToken: string;
      methods: string[];
    };

function getApiErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const payload = error.payload as { error?: { code?: string } } | null;
  return payload?.error?.code ?? null;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  return error.message || fallback;
}

export async function loginService(params: {
  email: string;
  password: string;
  totpCode?: string;
  challengeToken?: string;
}): Promise<LoginResult> {
  const payload = await requestJson<AuthLoginSuccessResponse | AuthLoginTwoFactorResponse>({
    path: '/api/auth/login',
    method: 'POST',
    withAuth: false,
    body: {
      email: params.email,
      password: params.password,
      ...(params.totpCode ? { totpCode: params.totpCode } : {}),
      ...(params.challengeToken ? { challengeToken: params.challengeToken } : {})
    }
  });

  if ('requiresTwoFactor' in payload && payload.requiresTwoFactor) {
    return {
      status: 'requires_2fa',
      challengeToken: payload.challengeToken,
      methods: payload.methods
    };
  }

  if (!('token' in payload)) {
    throw new Error('Réponse de login invalide.');
  }

  persistTokens({ accessToken: payload.token, refreshToken: payload.refreshToken ?? null });
  return {
    status: 'authenticated',
    user: payload.user
  };
}

export async function loadCurrentUserService(): Promise<User | null> {
  const token = getAccessToken();
  if (!token) {
    return null;
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

  clearStoredTokens();
}

export async function registerService(params: {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  password: string;
}): Promise<{ status: string; message: string }> {
  return requestJson<{ status: string; message: string }>({
    path: '/api/auth/register',
    method: 'POST',
    withAuth: false,
    body: params
  });
}

export async function verifyEmailService(token: string): Promise<{ status: string; approvalStatus: string }> {
  return requestJson<{ status: string; approvalStatus: string }>({
    path: '/api/auth/verify-email',
    method: 'POST',
    withAuth: false,
    body: { token }
  });
}

export async function resendVerificationService(email: string): Promise<void> {
  await requestJson<{ status: string }>({
    path: '/api/auth/resend-verification',
    method: 'POST',
    withAuth: false,
    body: { email }
  });
}

export async function forgotPasswordService(email: string): Promise<void> {
  await requestJson<{ status: string; message: string }>({
    path: '/api/auth/forgot-password',
    method: 'POST',
    withAuth: false,
    body: { email }
  });
}

export async function resetPasswordService(token: string, password: string): Promise<void> {
  await requestJson<{ status: string }>({
    path: '/api/auth/reset-password',
    method: 'POST',
    withAuth: false,
    body: { token, password }
  });
}

export async function changePasswordService(currentPassword: string, newPassword: string): Promise<void> {
  await requestJson<{ status: string }>({
    path: '/api/auth/change-password',
    method: 'POST',
    withAuth: true,
    body: { currentPassword, newPassword }
  });
}

export async function setupTotpService(): Promise<{ secret: string; otpauthUrl: string; recommended: boolean }> {
  return requestJson<{ secret: string; otpauthUrl: string; recommended: boolean }>({
    path: '/api/auth/totp/setup',
    method: 'POST',
    withAuth: true,
    body: {}
  });
}

export async function enableTotpService(code: string): Promise<void> {
  await requestJson<{ status: string }>({
    path: '/api/auth/totp/enable',
    method: 'POST',
    withAuth: true,
    body: { code }
  });
}

export async function disableTotpService(code: string): Promise<void> {
  await requestJson<{ status: string }>({
    path: '/api/auth/totp/disable',
    method: 'POST',
    withAuth: true,
    body: { code }
  });
}

export async function listPendingUsersService(): Promise<User[]> {
  const payload = await requestJson<{ items: User[] }>({
    path: '/api/admin/users/pending',
    method: 'GET',
    withAuth: true
  });
  return payload.items;
}

export async function approveUserService(userId: string, roles: string[]): Promise<User> {
  const payload = await requestJson<{ user: User }>({
    path: `/api/admin/users/${userId}/approve`,
    method: 'POST',
    withAuth: true,
    body: { roles }
  });
  return payload.user;
}

export function mapAuthErrorMessage(error: unknown): string {
  const code = getApiErrorCode(error);

  if (code === 'EMAIL_NOT_VERIFIED') {
    return 'Adresse email non validée. Vérifie ta boîte mail.';
  }
  if (code === 'ACCOUNT_PENDING_APPROVAL') {
    return 'Compte en attente de validation par un admin.';
  }
  if (code === 'ACCOUNT_LOCKED') {
    return 'Compte temporairement verrouillé après plusieurs échecs.';
  }
  if (code === 'INVALID_2FA_CODE') {
    return 'Code 2FA invalide.';
  }

  return getApiErrorMessage(error, 'Action impossible.');
}
