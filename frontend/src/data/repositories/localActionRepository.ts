import { db, ensureDatabaseIsInitialized } from '../db';
import { LocalAction, LocalActionEntityType } from '../../types/localAction';

export const localActionRepository = {
  async enqueue(params: {
    entityType: LocalActionEntityType;
    entityId: string;
    actionType: LocalAction['actionType'];
    payload: Record<string, unknown>;
  }): Promise<LocalAction> {
    await ensureDatabaseIsInitialized();

    const action: LocalAction = {
      id: crypto.randomUUID(),
      entityType: params.entityType,
      entityId: params.entityId,
      actionType: params.actionType,
      payload: params.payload,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0,
      lastSyncAttemptAt: null,
      syncedAt: null,
      conflictFields: null,
      conflictServerValues: null
    };

    await db.localActions.put(action);
    return action;
  },

  async listPending(): Promise<LocalAction[]> {
    await ensureDatabaseIsInitialized();
    return db.localActions.where('syncStatus').equals('pending').sortBy('createdAt');
  },

  async listSyncCandidates(): Promise<LocalAction[]> {
    await ensureDatabaseIsInitialized();
    const all = await db.localActions.toArray();
    return all
      .filter((action) => action.syncStatus === 'pending' || action.syncStatus === 'failed')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async markSynced(actionId: string): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.localActions.update(actionId, {
      syncStatus: 'synced',
      syncError: null,
      syncedAt: new Date().toISOString(),
      conflictFields: null,
      conflictServerValues: null
    });
  },

  async markFailed(actionId: string, reason: string): Promise<void> {
    await ensureDatabaseIsInitialized();
    const existing = await db.localActions.get(actionId);
    if (!existing) {
      return;
    }

    await db.localActions.update(actionId, {
      syncStatus: 'failed',
      syncError: reason,
      retryCount: existing.retryCount + 1,
      lastSyncAttemptAt: new Date().toISOString(),
      conflictFields: null,
      conflictServerValues: null
    });
  },

  async markRejected(actionId: string, reason: string, terminalRetryCount: number): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.localActions.update(actionId, {
      syncStatus: 'failed',
      syncError: reason,
      retryCount: terminalRetryCount,
      lastSyncAttemptAt: new Date().toISOString(),
      conflictFields: null,
      conflictServerValues: null
    });
  },

  async markConflict(
    actionId: string,
    reason: string,
    conflictFields: string[] = [],
    conflictServerValues: Record<string, unknown> = {}
  ): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.localActions.update(actionId, {
      syncStatus: 'conflict',
      syncError: reason,
      conflictFields,
      conflictServerValues,
      lastSyncAttemptAt: new Date().toISOString()
    });
  },

  async listConflicts(): Promise<LocalAction[]> {
    await ensureDatabaseIsInitialized();
    return db.localActions.where('syncStatus').equals('conflict').sortBy('createdAt');
  },

  async retryConflict(actionId: string): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.localActions.update(actionId, {
      syncStatus: 'pending',
      syncError: null,
      conflictFields: null,
      conflictServerValues: null
    });
  },

  async ignoreConflict(actionId: string): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.localActions.update(actionId, {
      syncStatus: 'synced',
      syncError: null,
      conflictFields: null,
      conflictServerValues: null,
      syncedAt: new Date().toISOString()
    });
  },

  async resolveConflictField(actionId: string, fieldName: string, strategy: 'keep_local' | 'keep_server'): Promise<void> {
    await ensureDatabaseIsInitialized();
    const action = await db.localActions.get(actionId);
    if (!action || action.syncStatus !== 'conflict') {
      return;
    }

    const currentConflictFields = action.conflictFields ?? [];
    const nextConflictFields = currentConflictFields.filter((field) => field !== fieldName);

    const nextPayload = { ...action.payload };
    if (strategy === 'keep_server') {
      const serverValue = action.conflictServerValues?.[fieldName];
      nextPayload[fieldName] = serverValue;
    }

    const hasRemainingConflicts = nextConflictFields.length > 0;

    await db.localActions.update(actionId, {
      payload: nextPayload,
      conflictFields: hasRemainingConflicts ? nextConflictFields : null,
      syncStatus: hasRemainingConflicts ? 'conflict' : 'pending',
      syncError: hasRemainingConflicts ? action.syncError : null,
      conflictServerValues: hasRemainingConflicts ? action.conflictServerValues : null,
      lastSyncAttemptAt: hasRemainingConflicts ? action.lastSyncAttemptAt ?? null : null
    });
  }
};
