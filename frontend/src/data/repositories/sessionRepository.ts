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
    ownerUserId: typeof raw.ownerUserId === 'string' ? raw.ownerUserId : undefined,
    gmUserId: String(raw.gmUserId ?? raw.ownerUserId ?? ''),
    gmUserIds: Array.isArray(raw.gmUserIds) ? raw.gmUserIds.filter((item): item is string => typeof item === 'string') : undefined,
    archivedAt: typeof raw.archivedAt === 'string' ? raw.archivedAt : raw.archivedAt === null ? null : undefined,
    state: normalizeSessionState(typeof raw.state === 'string' ? raw.state : typeof raw.status === 'string' ? raw.status : undefined),
    settings: (raw.settings as Session['settings']) ?? undefined,
    participants: (raw.players as Session['participants']) ?? (raw.participants as Session['participants']) ?? [],
    initiative: (raw.initiative as SessionInitiativeState) ?? undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString())
  };
}

export const sessionRepository = {
  async list(params?: { includeArchived?: boolean }): Promise<Session[]> {
    await ensureDatabaseIsInitialized();
    const includeArchived = Boolean(params?.includeArchived);
    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ items?: Record<string, unknown>[] }>({
          path: includeArchived ? '/api/sessions?includeArchived=true' : '/api/sessions',
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
    const all = await db.sessions.orderBy('updatedAt').reverse().toArray();
    if (includeArchived) {
      return all;
    }
    return all.filter((session) => !session.archivedAt);
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
            ownerUserId: session.ownerUserId,
            gmUserIds: session.gmUserIds,
            settings: session.settings,
            participants: session.participants,
            archivedAt: session.archivedAt ?? null
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

  async create(params: {
    name: string;
    description?: string;
    systemId: string;
    ownerUserId: string;
    settings?: Session['settings'];
  }): Promise<Session> {
    await ensureDatabaseIsInitialized();

    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ session?: Record<string, unknown> }>({
          path: '/api/sessions',
          method: 'POST',
          withAuth: true,
          body: {
            name: params.name,
            description: params.description,
            systemId: params.systemId,
            settings: params.settings
          }
        });
        if (payload.session) {
          const mapped = mapApiSession(payload.session);
          await db.sessions.put(mapped);
          return mapped;
        }
      } catch {
        // fallback local creation
      }
    }

    const now = new Date().toISOString();
    const session: Session = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: params.name.trim() || 'Nouvelle partie',
      description: params.description,
      systemId: params.systemId,
      ownerUserId: params.ownerUserId,
      gmUserId: params.ownerUserId,
      state: 'planned',
      settings: params.settings,
      participants: [{ userId: params.ownerUserId, role: 'gm', isConnected: false }],
      initiative: {
        round: 0,
        turnIndex: 0,
        isInCombat: false,
        entries: []
      },
      createdAt: now,
      updatedAt: now
    };

    await db.sessions.put(session);
    await localActionRepository.enqueue({
      entityType: 'session',
      entityId: session.id,
      actionType: 'create',
      payload: { ...session }
    });

    return session;
  },

  async remove(session: Session): Promise<void> {
    await ensureDatabaseIsInitialized();

    if (isBackendEnabled()) {
      try {
        await requestJson<void>({
          path: `/api/sessions/${session.id}`,
          method: 'DELETE',
          withAuth: true
        });
      } catch {
        // fallback local delete
      }
    }

    await db.sessions.delete(session.id);
    await localActionRepository.enqueue({
      entityType: 'session',
      entityId: session.id,
      actionType: 'delete',
      payload: { id: session.id }
    });
  },

  async archive(sessionId: string): Promise<Session | null> {
    await ensureDatabaseIsInitialized();
    const payload = await requestJson<{ session?: Record<string, unknown> }>({
      path: `/api/sessions/${sessionId}/archive`,
      method: 'POST',
      withAuth: true,
      body: {}
    });
    if (!payload.session) {
      return null;
    }
    const mapped = mapApiSession(payload.session);
    await db.sessions.put(mapped);
    return mapped;
  },

  async restore(sessionId: string): Promise<Session | null> {
    await ensureDatabaseIsInitialized();
    const payload = await requestJson<{ session?: Record<string, unknown> }>({
      path: `/api/sessions/${sessionId}/restore`,
      method: 'POST',
      withAuth: true,
      body: {}
    });
    if (!payload.session) {
      return null;
    }
    const mapped = mapApiSession(payload.session);
    await db.sessions.put(mapped);
    return mapped;
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
