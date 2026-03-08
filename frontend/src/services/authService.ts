import { User } from '../types/user';
import { apiClient } from './apiClient';

export async function loginService(email: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();

  return apiClient({
    id: normalizedEmail.includes('gm') ? 'user-gm-1' : 'user-player-1',
    email: normalizedEmail,
    displayName: normalizedEmail.includes('gm') ? 'MJ Mock' : 'Joueur Mock',
    roles: normalizedEmail.includes('gm') ? ['gm'] : ['player'],
    isEmailVerified: true,
    createdAt: new Date().toISOString()
  });
}
