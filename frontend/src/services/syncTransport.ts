import { apiClient } from './apiClient';
import { LocalAction } from '../types/localAction';
import { SyncActionResult } from '../types/sync';

type SyncTransportMode = 'mock' | 'http';

function getTransportMode(): SyncTransportMode {
  const mode = import.meta.env.VITE_SYNC_TRANSPORT;
  if (mode === 'http') {
    return 'http';
  }
  return 'mock';
}

export async function pushActionToServer(action: LocalAction): Promise<SyncActionResult> {
  const mode = getTransportMode();

  if (mode === 'mock') {
    const forced = typeof action.payload.__syncMode === 'string' ? action.payload.__syncMode : undefined;
    if (forced === 'conflict') {
      const forcedFields = Array.isArray(action.payload.__conflictFields)
        ? (action.payload.__conflictFields.filter((item): item is string => typeof item === 'string') as string[])
        : ['payload'];
      const serverValues =
        typeof action.payload.__serverValues === 'object' && action.payload.__serverValues !== null
          ? (action.payload.__serverValues as Record<string, unknown>)
          : {};
      return {
        status: 'conflict',
        reason: 'Conflit detecte (mode mock).',
        conflictFields: forcedFields,
        conflictServerValues: serverValues
      };
    }
    if (forced === 'rejected') {
      return {
        status: 'rejected',
        reason: 'Action rejetee (mode mock).'
      };
    }
    await apiClient({ ok: true, actionId: action.id }, 120);
    return { status: 'accepted' };
  }

  const response = await fetch('/api/sync/actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: action.id,
      entityType: action.entityType,
      entityId: action.entityId,
      actionType: action.actionType,
      payload: action.payload,
      createdAt: action.createdAt
    })
  });

  if (!response.ok) {
    throw new Error(`Sync HTTP error: ${response.status}`);
  }

  if (response.status === 204) {
    return { status: 'accepted' };
  }

  const payload = (await response.json()) as Partial<SyncActionResult>;
  if (payload.status === 'accepted' || payload.status === 'conflict' || payload.status === 'rejected') {
    return {
      status: payload.status,
      reason: payload.reason,
      conflictFields: payload.conflictFields,
      conflictServerValues: payload.conflictServerValues
    };
  }

  return { status: 'accepted' };
}
