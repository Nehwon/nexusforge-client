export type SessionState = 'planned' | 'running' | 'paused' | 'finished';

export interface Session {
  id: string;
  systemId: string;
  campaignId?: string | null;
  name: string;
  description?: string;
  gmUserId: string;
  state: SessionState;
  createdAt: string;
  updatedAt: string;
}
