import { useEffect, useState } from 'react';
import { localActionRepository } from '../../../data/repositories';
import { LocalAction } from '../../../types/localAction';
import { runSyncCycle } from '../../../services/syncService';

function readLocalFieldValue(action: LocalAction, fieldName: string): unknown {
  return action.payload[fieldName];
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

export default function SyncConflictsPanel() {
  const [conflicts, setConflicts] = useState<LocalAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadConflicts = async () => {
    try {
      const items = await localActionRepository.listConflicts();
      setConflicts(items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les conflits de sync.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConflicts();
    const intervalId = window.setInterval(() => {
      void loadConflicts();
    }, 10_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleRetry = async (actionId: string) => {
    try {
      await localActionRepository.retryConflict(actionId);
      await runSyncCycle();
      await loadConflicts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de rejouer ce conflit.');
    }
  };

  const handleIgnore = async (actionId: string) => {
    try {
      await localActionRepository.ignoreConflict(actionId);
      await loadConflicts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible d ignorer ce conflit.');
    }
  };

  const handleResolveField = async (
    actionId: string,
    fieldName: string,
    strategy: 'keep_local' | 'keep_server'
  ) => {
    try {
      await localActionRepository.resolveConflictField(actionId, fieldName, strategy);
      await runSyncCycle();
      await loadConflicts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de resoudre ce champ en conflit.');
    }
  };

  const handleResolveAllFields = async (conflict: LocalAction, strategy: 'keep_local' | 'keep_server') => {
    const fields = conflict.conflictFields ?? [];
    if (fields.length === 0) {
      return;
    }

    try {
      for (const fieldName of fields) {
        await localActionRepository.resolveConflictField(conflict.id, fieldName, strategy);
      }
      await runSyncCycle();
      await loadConflicts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de resoudre tous les champs.');
    }
  };

  if (isLoading) {
    return <section className="card">Chargement des conflits de sync...</section>;
  }

  if (errorMessage) {
    return (
      <section className="card" style={{ color: '#b42318' }}>
        {errorMessage}
      </section>
    );
  }

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <section className="card" style={{ borderColor: '#f79009', background: '#fffaeb' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.6rem' }}>Conflits de synchronisation ({conflicts.length})</h2>
      <p style={{ marginTop: 0 }}>
        Certaines actions locales sont en conflit avec l etat serveur. Tu peux rejouer ou ignorer chaque action.
      </p>
      <div style={{ display: 'grid', gap: '0.7rem' }}>
        {conflicts.map((conflict) => (
          <article key={conflict.id} style={{ border: '1px solid #fdb022', borderRadius: 8, padding: '0.65rem' }}>
            <p style={{ margin: 0 }}>
              <strong>{conflict.entityType}</strong> / {conflict.actionType} / {conflict.entityId}
            </p>
            <p style={{ margin: '0.35rem 0 0' }}>{conflict.syncError ?? 'Conflit sans detail'}</p>
            {conflict.conflictFields?.length ? (
              <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.4rem' }}>
                <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      void handleResolveAllFields(conflict, 'keep_local');
                    }}
                  >
                    Tout garder local
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      void handleResolveAllFields(conflict, 'keep_server');
                    }}
                  >
                    Tout garder serveur
                  </button>
                </div>
                {conflict.conflictFields.map((fieldName) => {
                  const localValue = readLocalFieldValue(conflict, fieldName);
                  const serverValue = conflict.conflictServerValues?.[fieldName];

                  return (
                    <div
                      key={fieldName}
                      style={{
                        border: '1px solid #fdd17f',
                        borderRadius: 6,
                        background: '#fff',
                        padding: '0.45rem'
                      }}
                    >
                      <p style={{ margin: 0 }}>
                        <strong>{fieldName}</strong>
                      </p>
                      <p style={{ margin: '0.25rem 0 0' }}>
                        Local: <code>{formatValue(localValue)}</code>
                      </p>
                      <p style={{ margin: '0.2rem 0 0' }}>
                        Serveur: <code>{formatValue(serverValue)}</code>
                      </p>
                      <div style={{ marginTop: '0.4rem', display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => {
                            void handleResolveField(conflict.id, fieldName, 'keep_local');
                          }}
                        >
                          Garder local
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => {
                            void handleResolveField(conflict.id, fieldName, 'keep_server');
                          }}
                        >
                          Garder serveur
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div style={{ marginTop: '0.55rem', display: 'inline-flex', gap: '0.45rem' }}>
              <button className="button" type="button" onClick={() => void handleRetry(conflict.id)}>
                Rejouer
              </button>
              <button className="button secondary" type="button" onClick={() => void handleIgnore(conflict.id)}>
                Ignorer
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
