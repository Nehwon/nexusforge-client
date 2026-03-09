export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  email: string;
  displayName: string;
  roles: string[];
  isEmailVerified?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | string;
  hasTotpEnabled?: boolean;
  isProtectedRootAdmin?: boolean;
  avatarUrl?: string | null;
  createdAt: string;
}
