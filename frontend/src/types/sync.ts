export type SyncActionStatus = 'accepted' | 'conflict' | 'rejected';

export interface SyncActionResult {
  status: SyncActionStatus;
  reason?: string;
  conflictFields?: string[];
  conflictServerValues?: Record<string, unknown>;
}
