import { useEffect, useMemo, useState } from 'react';
import { localActionRepository } from '../../../data/repositories';
import { runSyncCycle, SyncCycleReport } from '../../../services/syncService';
import { LocalAction } from '../../../types/localAction';

type SyncCounts = {
  total: number;
  pending: number;
  failed: number;
  conflicts: number;
  synced: number;
};

const EMPTY_COUNTS: SyncCounts = {
  total: 0,
  pending: 0,
  failed: 0,
  conflicts: 0,
  synced: 0
};

function computeCounts(actions: LocalAction[]): SyncCounts {
  return actions.reduce<SyncCounts>(
    (accumulator, action) => {
      accumulator.total += 1;

      if (action.syncStatus === 'pending') {
        accumulator.pending += 1;
      } else if (action.syncStatus === 'failed') {
        accumulator.failed += 1;
      } else if (action.syncStatus === 'conflict') {
        accumulator.conflicts += 1;
      } else if (action.syncStatus === 'synced') {
        accumulator.synced += 1;
      }

      return accumulator;
    },
    { ...EMPTY_COUNTS }
  );
}

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) {
    return 'jamais';
  }

  const deltaMs = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) {
    return `il y a ${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `il y a ${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  return `il y a ${hours}h`;
}

export default function SyncStatusPanel() {
  const [actions, setActions] = useState<LocalAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<SyncCycleReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const counts = useMemo(() => computeCounts(actions), [actions]);

  const loadActions = async () => {
    try {
      const items = await localActionRepository.listAll();
      setActions(items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger l etat de sync.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadActions();
    const intervalId = window.setInterval(() => {
      void loadActions();
    }, 10_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const report = await runSyncCycle();
      setLastRunAt(new Date().toISOString());
      setLastReport(report);
      await loadActions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur pendant la synchronisation.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <section className="card">Chargement du statut de synchronisation...</section>;
  }

  return (
    <section className="card sync-status-panel">
      <header className="sync-status-panel__header">
        <h2 style={{ margin: 0 }}>Statut Synchronisation</h2>
        <button className="button" type="button" onClick={() => void handleSyncNow()} disabled={isSyncing}>
          {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
        </button>
      </header>

      <p style={{ margin: '0.35rem 0 0' }}>
        Dernier cycle: <strong>{formatRelativeTime(lastRunAt)}</strong>
      </p>

      <div className="sync-status-panel__metrics">
        <article className="sync-metric">
          <span>Total</span>
          <strong>{counts.total}</strong>
        </article>
        <article className="sync-metric">
          <span>Pending</span>
          <strong>{counts.pending}</strong>
        </article>
        <article className="sync-metric">
          <span>Conflits</span>
          <strong>{counts.conflicts}</strong>
        </article>
        <article className="sync-metric">
          <span>Failed</span>
          <strong>{counts.failed}</strong>
        </article>
        <article className="sync-metric">
          <span>Synced</span>
          <strong>{counts.synced}</strong>
        </article>
      </div>

      {lastReport ? (
        <p style={{ margin: '0.5rem 0 0', color: '#475467' }}>
          Dernier rapport: traitees {lastReport.processed}, synced {lastReport.synced}, conflits {lastReport.conflicts},
          failed {lastReport.failed}, rejected {lastReport.rejected}, skipped {lastReport.skipped}.
        </p>
      ) : null}

      {errorMessage ? <p style={{ margin: '0.5rem 0 0', color: '#b42318' }}>{errorMessage}</p> : null}
    </section>
  );
}
