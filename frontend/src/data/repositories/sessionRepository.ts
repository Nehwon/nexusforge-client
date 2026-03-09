import { db, ensureDatabaseIsInitialized } from '../db';
import { Session, SessionInitiativeState } from '../../types/session';
import { localActionRepository } from './localActionRepository';

export const sessionRepository = {
  async list(): Promise<Session[]> {
    await ensureDatabaseIsInitialized();
    return db.sessions.orderBy('updatedAt').reverse().toArray();
  },

  async getById(sessionId: string): Promise<Session | null> {
    await ensureDatabaseIsInitialized();
    const session = await db.sessions.get(sessionId);
    return session ?? null;
  },

  async upsert(session: Session): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.sessions.put(session);
    await localActionRepository.enqueue({
      entityType: 'session',
      entityId: session.id,
      actionType: 'update',
      payload: { ...session }
    });
  },

  async updateInitiative(sessionId: string, initiative: SessionInitiativeState): Promise<Session | null> {
    await ensureDatabaseIsInitialized();
    const session = await db.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const nextSession: Session = {
      ...session,
      initiative,
      updatedAt: new Date().toISOString()
    };

    await db.sessions.put(nextSession);
    await localActionRepository.enqueue({
      entityType: 'session',
      entityId: sessionId,
      actionType: 'update',
      payload: { initiative }
    });

    return nextSession;
  }
};
