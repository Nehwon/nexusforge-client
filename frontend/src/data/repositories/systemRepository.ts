import { db, ensureDatabaseIsInitialized } from '../db';
import { GameSystem, GameSystemVisibility } from '../../types/system';
import { User } from '../../types/user';
import { localActionRepository } from './localActionRepository';
import { isBackendEnabled, requestJson } from '../../services/apiClient';

function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

function isAdmin(user: User): boolean {
  return user.roles.includes('admin');
}

export function canUserEditSystem(system: GameSystem, user: User): boolean {
  return system.ownerUserId === user.id || isAdmin(user);
}

function canUserViewSystem(system: GameSystem, user: User): boolean {
  return system.visibility === 'public' || system.ownerUserId === user.id || isAdmin(user);
}

function cloneSystemForDuplicate(source: GameSystem, actor: User, name?: string): GameSystem {
  const now = new Date().toISOString();
  return {
    ...source,
    id: makeId('sys'),
    name: name?.trim() || `${source.name} (copie)`,
    ownerUserId: actor.id,
    visibility: 'private',
    forkedFromSystemId: source.id,
    forkedFromSystemName: source.name,
    createdAt: now,
    updatedAt: now,
    studioSchema: source.studioSchema
      ? {
          views: source.studioSchema.views.map((view) => ({
            ...view,
            components: view.components.map((component) => ({ ...component }))
          }))
        }
      : undefined,
    rulesProgram: source.rulesProgram?.map((block) => ({ ...block })) ?? [],
    referenceSheets:
      source.referenceSheets?.map((sheet) => ({
        ...sheet,
        fields: sheet.fields.map((field) => ({ ...field })),
        groups: sheet.groups.map((group) => ({ ...group })),
        actions: sheet.actions?.map((action) => ({ ...action }))
      })) ?? []
  };
}

function mapApiSystem(raw: Record<string, unknown>): GameSystem {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'Systeme'),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    version: String(raw.version ?? '0.1.0'),
    author: typeof raw.author === 'string' ? raw.author : undefined,
    ownerUserId: String(raw.ownerUserId ?? ''),
    visibility: raw.visibility === 'private' ? 'private' : 'public',
    forkedFromSystemId: typeof raw.forkedFromSystemId === 'string' ? raw.forkedFromSystemId : undefined,
    forkedFromSystemName: typeof raw.forkedFromSystemName === 'string' ? raw.forkedFromSystemName : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((item): item is string => typeof item === 'string') : [],
    rollDefinitions: Array.isArray(raw.rollDefinitions) ? (raw.rollDefinitions as GameSystem['rollDefinitions']) : [],
    rulesProgram: Array.isArray(raw.rulesProgram) ? (raw.rulesProgram as GameSystem['rulesProgram']) : [],
    rulesPresentation:
      raw.rulesPresentation && typeof raw.rulesPresentation === 'object'
        ? (raw.rulesPresentation as GameSystem['rulesPresentation'])
        : undefined,
    studioSchema: raw.studioSchema && typeof raw.studioSchema === 'object' ? (raw.studioSchema as GameSystem['studioSchema']) : undefined,
    referenceSheets: Array.isArray(raw.referenceSheets) ? (raw.referenceSheets as GameSystem['referenceSheets']) : [],
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString())
  };
}

export const systemRepository = {
  async list(): Promise<GameSystem[]> {
    await ensureDatabaseIsInitialized();
    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ items?: Record<string, unknown>[] }>({
          path: '/api/systems',
          method: 'GET',
          withAuth: true
        });
        const systems = (payload.items ?? []).map(mapApiSystem);
        if (systems.length > 0) {
          await db.systems.bulkPut(systems);
        }
      } catch {
        // fallback local cache
      }
    }
    return db.systems.orderBy('updatedAt').reverse().toArray();
  },

  async listAvailableForUser(user: User): Promise<GameSystem[]> {
    await ensureDatabaseIsInitialized();
    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ items?: Record<string, unknown>[] }>({
          path: '/api/systems',
          method: 'GET',
          withAuth: true
        });
        const systems = (payload.items ?? []).map(mapApiSystem);
        if (systems.length > 0) {
          await db.systems.bulkPut(systems);
        }
      } catch {
        // fallback local cache
      }
    }
    const all = await db.systems.orderBy('updatedAt').reverse().toArray();
    return all.filter((system) => canUserViewSystem(system, user));
  },

  async getById(systemId: string): Promise<GameSystem | null> {
    await ensureDatabaseIsInitialized();
    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ system?: Record<string, unknown> }>({
          path: `/api/systems/${systemId}`,
          method: 'GET',
          withAuth: true
        });
        if (payload.system) {
          await db.systems.put(mapApiSystem(payload.system));
        }
      } catch {
        // fallback local cache
      }
    }
    const system = await db.systems.get(systemId);
    return system ?? null;
  },

  async getByIdForUser(systemId: string, user: User): Promise<GameSystem | null> {
    await ensureDatabaseIsInitialized();
    const system = await db.systems.get(systemId);
    if (!system || !canUserViewSystem(system, user)) {
      return null;
    }
    return system;
  },

  async create(params: {
    owner: User;
    name: string;
    description?: string;
    version?: string;
    visibility?: GameSystemVisibility;
    templateFromSystemId?: string;
  }): Promise<GameSystem> {
    await ensureDatabaseIsInitialized();

    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ system: Record<string, unknown> }>({
          path: '/api/systems',
          method: 'POST',
          withAuth: true,
          body: {
            name: params.name,
            description: params.description ?? '',
            version: params.version ?? '0.1.0',
            visibility: params.visibility ?? 'private',
            templateFromSystemId: params.templateFromSystemId
          }
        });
        const mapped = mapApiSystem(payload.system);
        await db.systems.put(mapped);
        return mapped;
      } catch {
        // fallback local creation
      }
    }

    const now = new Date().toISOString();
    let referenceSheets: NonNullable<GameSystem['referenceSheets']> = [];
    let rulesProgram: NonNullable<GameSystem['rulesProgram']> = [];
    let studioSchema: GameSystem['studioSchema'] = undefined;
    let forkedFromSystemId: string | undefined;
    let forkedFromSystemName: string | undefined;

    if (params.templateFromSystemId) {
      const source = await db.systems.get(params.templateFromSystemId);
      if (source && canUserViewSystem(source, params.owner)) {
        referenceSheets =
          source.referenceSheets?.map((sheet) => ({
            ...sheet,
            fields: sheet.fields.map((field) => ({ ...field })),
            groups: sheet.groups.map((group) => ({ ...group })),
            actions: sheet.actions?.map((action) => ({ ...action }))
          })) ?? [];
        rulesProgram = source.rulesProgram?.map((block) => ({ ...block })) ?? [];
        studioSchema = source.studioSchema
          ? {
              views: source.studioSchema.views.map((view) => ({
                ...view,
                components: view.components.map((component) => ({ ...component }))
              }))
            }
          : undefined;
        forkedFromSystemId = source.id;
        forkedFromSystemName = source.name;
      }
    }

    const system: GameSystem = {
      id: makeId('sys'),
      name: params.name.trim() || 'Nouveau systeme',
      description: params.description?.trim() || '',
      version: params.version ?? '0.1.0',
      author: params.owner.displayName,
      ownerUserId: params.owner.id,
      visibility: params.visibility ?? 'private',
      ...(forkedFromSystemId ? { forkedFromSystemId } : {}),
      ...(forkedFromSystemName ? { forkedFromSystemName } : {}),
      tags: ['custom'],
      ...(studioSchema ? { studioSchema } : {}),
      rulesProgram,
      referenceSheets,
      createdAt: now,
      updatedAt: now
    };

    await db.systems.put(system);
    await localActionRepository.enqueue({
      entityType: 'system',
      entityId: system.id,
      actionType: 'create',
      payload: system as unknown as Record<string, unknown>
    });

    return system;
  },

  async duplicate(params: { sourceSystemId: string; actor: User; name?: string; description?: string }): Promise<GameSystem> {
    await ensureDatabaseIsInitialized();
    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ system: Record<string, unknown> }>({
          path: `/api/systems/${params.sourceSystemId}/duplicate`,
          method: 'POST',
          withAuth: true,
          body: {
            ...(params.name ? { name: params.name } : {}),
            ...(typeof params.description === 'string' ? { description: params.description } : {})
          }
        });
        const mapped = mapApiSystem(payload.system);
        await db.systems.put(mapped);
        return mapped;
      } catch {
        // fallback local duplicate
      }
    }

    const source = await db.systems.get(params.sourceSystemId);
    if (!source || !canUserViewSystem(source, params.actor)) {
      throw new Error('Systeme source introuvable ou inaccessible.');
    }

    const duplicated = {
      ...cloneSystemForDuplicate(source, params.actor, params.name),
      description: typeof params.description === 'string' ? params.description : source.description
    };
    await db.systems.put(duplicated);
    await localActionRepository.enqueue({
      entityType: 'system',
      entityId: duplicated.id,
      actionType: 'create',
      payload: duplicated as unknown as Record<string, unknown>
    });

    return duplicated;
  },

  async upsert(system: GameSystem, actor?: User): Promise<void> {
    await ensureDatabaseIsInitialized();

    if (isBackendEnabled()) {
      try {
        await requestJson<{ system?: Record<string, unknown> }>({
          path: `/api/systems/${system.id}`,
          method: 'PATCH',
          withAuth: true,
          body: {
            name: system.name,
            description: system.description,
            version: system.version,
            visibility: system.visibility,
            tags: system.tags,
            rulesProgram: system.rulesProgram,
            rulesPresentation: system.rulesPresentation,
            studioSchema: system.studioSchema,
            referenceSheets: system.referenceSheets
          }
        });
      } catch {
        // fallback local queue
      }
    }

    const existing = await db.systems.get(system.id);
    if (existing && actor && !canUserEditSystem(existing, actor)) {
      throw new Error('Modification interdite: seul le proprietaire ou un admin peut modifier ce systeme.');
    }

    const nextSystem: GameSystem = {
      ...system,
      ownerUserId: existing?.ownerUserId ?? actor?.id ?? system.ownerUserId,
      updatedAt: new Date().toISOString()
    };

    await db.systems.put(nextSystem);
    await localActionRepository.enqueue({
      entityType: 'system',
      entityId: system.id,
      actionType: 'update',
      payload: nextSystem as unknown as Record<string, unknown>
    });
  },

  async listUsageForAdmin(): Promise<
    Array<
      GameSystem & {
        usage: {
          usersUsingNow: number;
          activeSessionsCount: number;
          archivedSessionsCount: number;
          totalSessionsCount: number;
          lastUsedAt: string | null;
        };
      }
    >
  > {
    const payload = await requestJson<{ items: Array<Record<string, unknown> & { usage?: Record<string, unknown> }> }>({
      path: '/api/admin/systems/usage',
      method: 'GET',
      withAuth: true
    });

    return payload.items.map((raw) => {
      const mapped = mapApiSystem(raw);
      const usageRaw = raw.usage ?? {};
      return {
        ...mapped,
        usage: {
          usersUsingNow: Number(usageRaw.usersUsingNow ?? 0),
          activeSessionsCount: Number(usageRaw.activeSessionsCount ?? 0),
          archivedSessionsCount: Number(usageRaw.archivedSessionsCount ?? 0),
          totalSessionsCount: Number(usageRaw.totalSessionsCount ?? 0),
          lastUsedAt: typeof usageRaw.lastUsedAt === 'string' ? usageRaw.lastUsedAt : null
        }
      };
    });
  },

  async deleteAsAdmin(params: { systemId: string; replacementSystemId: string }): Promise<{ migratedSessionsCount: number }> {
    const payload = await requestJson<{ migratedSessionsCount?: number }>({
      path: `/api/admin/systems/${params.systemId}`,
      method: 'DELETE',
      withAuth: true,
      body: { replacementSystemId: params.replacementSystemId }
    });
    await db.systems.delete(params.systemId);
    return {
      migratedSessionsCount: Number(payload.migratedSessionsCount ?? 0)
    };
  }
};
