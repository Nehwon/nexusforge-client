import { Session } from '../types/session';

export function useSession(sessionId: string): Session {
  return {
    id: sessionId,
    systemId: 'sys-generic',
    name: `Session ${sessionId}`,
    gmUserId: 'user-gm-1',
    state: 'running',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
