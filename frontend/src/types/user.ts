export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  isEmailVerified?: boolean;
  avatarUrl?: string | null;
  createdAt: string;
}
