import { localActionRepository } from '../data/repositories';
import { LocalAction } from '../types/localAction';
import { pushActionToServer } from './syncTransport';

let isRunning = false;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2_000;

export type SyncCycleReport = {
  processed: number;
  synced: number;
  failed: number;
  conflicts: number;
  rejected: number;
  skipped: number;
};

function shouldRetry(action: LocalAction, now: number): boolean {
  if (action.syncStatus === 'pending') {
    return true;
  }

  if (action.syncStatus !== 'failed') {
    return false;
  }

  if (action.retryCount >= MAX_RETRIES) {
    return false;
  }

  const lastAttemptAt = action.lastSyncAttemptAt ? new Date(action.lastSyncAttemptAt).getTime() : 0;
  const backoffMs = BASE_BACKOFF_MS * Math.pow(2, Math.max(0, action.retryCount - 1));
  return now - lastAttemptAt >= backoffMs;
}

export async function runSyncCycle(): Promise<SyncCycleReport> {
  const emptyReport: SyncCycleReport = { processed: 0, synced: 0, failed: 0, conflicts: 0, rejected: 0, skipped: 0 };

  if (isRunning) {
    return emptyReport;
  }

  if (!navigator.onLine) {
    return emptyReport;
  }

  isRunning = true;
  try {
    const candidates = await localActionRepository.listSyncCandidates();
    const now = Date.now();
    let processed = 0;
    let synced = 0;
    let failed = 0;
    let conflicts = 0;
    let rejected = 0;
    let skipped = 0;

    for (const action of candidates) {
      if (!shouldRetry(action, now)) {
        skipped += 1;
        continue;
      }

      processed += 1;
      try {
        const result = await pushActionToServer(action);

        if (result.status === 'accepted') {
          await localActionRepository.markSynced(action.id);
          synced += 1;
          continue;
        }

        if (result.status === 'conflict') {
          await localActionRepository.markConflict(
            action.id,
            result.reason ?? 'Conflit de synchronisation.',
            result.conflictFields ?? [],
            result.conflictServerValues ?? {}
          );
          conflicts += 1;
          continue;
        }

        await localActionRepository.markRejected(
          action.id,
          result.reason ?? 'Action rejetee par le serveur.',
          MAX_RETRIES
        );
        rejected += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown sync error';
        await localActionRepository.markFailed(action.id, reason);
        failed += 1;
      }
    }

    return { processed, synced, failed, conflicts, rejected, skipped };
  } finally {
    isRunning = false;
  }
}
