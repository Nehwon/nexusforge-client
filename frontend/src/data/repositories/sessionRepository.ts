import { db, ensureDatabaseIsInitialized } from '../db';
import { Session, SessionInitiativeState } from '../../types/session';
import { localActionRepository } from './localActionRepository';
import { isBackendEnabled, requestJson } from '../../services/apiClient';

function normalizeSessionState(state: string | undefined): Session['state'] {
  if (state === 'planned' || state === 'running' || state === 'paused' || state === 'finished') {
    return state;
  }
  return 'planned';
}

function mapApiSession(raw: Record<string, unknown>): Session {
  return {
    id: String(raw.id ?? ''),
    systemId: String(raw.systemId ?? ''),
    name: String(raw.name ?? ''),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    gmUserId: String(raw.gmUserId ?? raw.ownerUserId ?? ''),
    state: normalizeSessionState(typeof raw.state === 'string' ? raw.state : typeof raw.status === 'string' ? raw.status : undefined),
    settings: (raw.settings as Session['settings']) ?? undefined,
    participants: (raw.players as Session['participants']) ?? (raw.participants as Session['participants']) ?? [],
    initiative: (raw.initiative as SessionInitiativeState) ?? undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString())
  };
}

export const sessionRepository = {
  async list(): Promise<Session[]> {
    await ensureDatabaseIsInitialized();
    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ items?: Record<string, unknown>[] }>({
          path: '/api/sessions',
          method: 'GET',
          withAuth: true
        });
        const sessions = (payload.items ?? []).map(mapApiSession);
        if (sessions.length > 0) {
          await db.sessions.bulkPut(sessions);
        }
      } catch {
        // fallback local cache
      }
    }
    return db.sessions.orderBy('updatedAt').reverse().toArray();
  },

  async getById(sessionId: string): Promise<Session | null> {
    await ensureDatabaseIsInitialized();
    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ session?: Record<string, unknown> }>({
          path: `/api/sessions/${sessionId}`,
          method: 'GET',
          withAuth: true
        });
        if (payload.session) {
          const mapped = mapApiSession(payload.session);
          await db.sessions.put(mapped);
        }
      } catch {
        // fallback local cache
      }
    }
    const session = await db.sessions.get(sessionId);
    return session ?? null;
  },

  async upsert(session: Session): Promise<void> {
    await ensureDatabaseIsInitialized();
    if (isBackendEnabled()) {
      try {
        await requestJson<{ session?: Record<string, unknown> }>({
          path: `/api/sessions/${session.id}`,
          method: 'PATCH',
          withAuth: true,
          body: {
            name: session.name,
            description: session.description,
            state: session.state,
            systemId: session.systemId,
            settings: session.settings,
            participants: session.participants
          }
        });
      } catch {
        // fallback local queue
      }
    }
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

    if (isBackendEnabled()) {
      try {
        await requestJson<{ session?: Record<string, unknown> }>({
          path: `/api/sessions/${sessionId}`,
          method: 'PATCH',
          withAuth: true,
          body: { initiative }
        });
      } catch {
        // fallback local queue
      }
    }

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
