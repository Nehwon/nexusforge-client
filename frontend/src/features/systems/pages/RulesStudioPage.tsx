import { useEffect, useMemo, useState } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import { systemRepository } from '../../../data/repositories';
import { GameSystem } from '../../../types/system';
import Button from '../../../components/Button';
import SystemBuilderWidget from '../../dashboard/widgets/SystemBuilderWidget';
import { Session } from '../../../types/session';

type AdminSystemUsage = GameSystem & {
  usage: {
    usersUsingNow: number;
    activeSessionsCount: number;
    archivedSessionsCount: number;
    totalSessionsCount: number;
    lastUsedAt: string | null;
  };
};

function makeStudioSession(systemId: string, userId: string): Session {
  const now = new Date().toISOString();
  return {
    id: `studio-${systemId}`,
    systemId,
    name: 'Studio des règles',
    ownerUserId: userId,
    gmUserId: userId,
    state: 'planned',
    participants: [{ userId, role: 'gm', isConnected: true }],
    createdAt: now,
    updatedAt: now
  };
}

export default function RulesStudioPage() {
  const { currentUser } = useAuth();
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [adminUsage, setAdminUsage] = useState<AdminSystemUsage[]>([]);
  const [replacementBySystemId, setReplacementBySystemId] = useState<Record<string, string>>({});
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [newSystemName, setNewSystemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canManage = Boolean(currentUser && (currentUser.roles.includes('gm') || currentUser.roles.includes('admin')));
  const isAdmin = Boolean(currentUser?.roles.includes('admin'));

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === selectedSystemId) ?? null,
    [systems, selectedSystemId]
  );

  const studioSession = useMemo(() => {
    if (!currentUser || !selectedSystem) {
      return null;
    }
    return makeStudioSession(selectedSystem.id, currentUser.id);
  }, [currentUser, selectedSystem]);

  const reloadSystems = async () => {
    if (!currentUser) {
      setSystems([]);
      setAdminUsage([]);
      setSelectedSystemId('');
      return;
    }
    const [availableSystems, usage] = await Promise.all([
      systemRepository.listAvailableForUser(currentUser),
      isAdmin ? systemRepository.listUsageForAdmin() : Promise.resolve([])
    ]);
    setSystems(availableSystems);
    setAdminUsage(usage as AdminSystemUsage[]);
    setSelectedSystemId((current) => current || availableSystems[0]?.id || '');
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        if (!currentUser) {
          return;
        }
        const [availableSystems, usage] = await Promise.all([
          systemRepository.listAvailableForUser(currentUser),
          isAdmin ? systemRepository.listUsageForAdmin() : Promise.resolve([])
        ]);
        if (!isMounted) {
          return;
        }
        setSystems(availableSystems);
        setAdminUsage(usage as AdminSystemUsage[]);
        setSelectedSystemId(availableSystems[0]?.id ?? '');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les systèmes.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [currentUser, isAdmin]);

  const handleCreateSystem = async () => {
    if (!currentUser || !canManage) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const created = await systemRepository.create({
        owner: currentUser,
        name: newSystemName.trim() || 'Nouveau système',
        visibility: 'private'
      });
      await reloadSystems();
      setSelectedSystemId(created.id);
      setNewSystemName('');
      setStatusMessage('Nouveau système créé.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de créer le système.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateSystem = async () => {
    if (!currentUser || !canManage || !selectedSystem) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const duplicated = await systemRepository.duplicate({
        sourceSystemId: selectedSystem.id,
        actor: currentUser,
        name: `${selectedSystem.name} (copie ${currentUser.displayName})`
      });
      await reloadSystems();
      setSelectedSystemId(duplicated.id);
      setStatusMessage('Système dupliqué.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de dupliquer le système.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSystem = async (systemId: string) => {
    if (!isAdmin) {
      return;
    }
    const target = adminUsage.find((item) => item.id === systemId);
    if (!target) {
      return;
    }
    const replacementSystemId =
      replacementBySystemId[systemId] ||
      systems.find((item) => item.id !== systemId)?.id ||
      adminUsage.find((item) => item.id !== systemId)?.id ||
      '';
    if (!replacementSystemId) {
      setErrorMessage('Aucun système de remplacement disponible.');
      return;
    }

    const confirmed = window.confirm(
      `Supprimer le système "${target.name}" ? Les parties liées seront migrées vers "${replacementSystemId}".`
    );
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      const result = await systemRepository.deleteAsAdmin({
        systemId,
        replacementSystemId
      });
      await reloadSystems();
      setStatusMessage(`Système supprimé. Parties migrées: ${result.migratedSessionsCount}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Suppression impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <section className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ marginTop: 0 }}>Studio des règles</h1>
        <p style={{ marginTop: 0 }}>
          Module dédié à la création visuelle des systèmes de jeu (blocs, drag & drop, preview des fiches).
        </p>

        {!canManage ? (
          <p style={{ marginBottom: 0, color: '#b42318' }}>
            Accès réservé MJ/Admin pour l’édition.
          </p>
        ) : (
          <div className="grid">
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Système à éditer</span>
              <select value={selectedSystemId} onChange={(event) => setSelectedSystemId(event.target.value)} disabled={isLoading}>
                {systems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name} ({system.visibility})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Créer un système</span>
              <input
                type="text"
                value={newSystemName}
                onChange={(event) => setNewSystemName(event.target.value)}
                placeholder="Nom du système"
              />
            </label>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Button type="button" onClick={() => void handleCreateSystem()} disabled={isSaving}>
                Créer
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleDuplicateSystem()} disabled={isSaving || !selectedSystem}>
                Dupliquer
              </Button>
            </div>
          </div>
        )}

        {statusMessage ? <p style={{ marginBottom: 0, color: '#067647' }}>{statusMessage}</p> : null}
        {errorMessage ? <p style={{ marginBottom: 0, color: '#b42318' }}>{errorMessage}</p> : null}
      </section>

      {isAdmin ? (
        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Usage des systèmes (admin)</h2>
          {adminUsage.length === 0 ? <p>Aucun système.</p> : null}
          <div className="grid">
            {adminUsage.map((item) => (
              <article key={item.id} className="card">
                <h3 style={{ marginTop: 0 }}>{item.name}</h3>
                <p style={{ marginTop: 0, marginBottom: '0.45rem' }}>ID: {item.id}</p>
                <p style={{ margin: 0 }}>Personnes qui l’utilisent actuellement: {item.usage.usersUsingNow}</p>
                <p style={{ margin: 0 }}>Parties actives: {item.usage.activeSessionsCount}</p>
                <p style={{ margin: 0 }}>Parties archivées: {item.usage.archivedSessionsCount}</p>
                <p style={{ margin: 0 }}>Dernière utilisation: {item.usage.lastUsedAt ? new Date(item.usage.lastUsedAt).toLocaleString() : 'Jamais'}</p>
                <label style={{ display: 'grid', gap: '0.35rem', marginTop: '0.55rem' }}>
                  <span>Système de remplacement (si suppression)</span>
                  <select
                    value={replacementBySystemId[item.id] ?? ''}
                    onChange={(event) =>
                      setReplacementBySystemId((previous) => ({
                        ...previous,
                        [item.id]: event.target.value
                      }))
                    }
                  >
                    <option value="">Auto</option>
                    {adminUsage
                      .filter((candidate) => candidate.id !== item.id)
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div style={{ marginTop: '0.55rem' }}>
                  <Button type="button" variant="secondary" onClick={() => void handleDeleteSystem(item.id)} disabled={isSaving}>
                    Supprimer le système
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        {isLoading ? <p style={{ margin: 0 }}>Chargement du studio...</p> : null}
        {!isLoading && studioSession && currentUser ? (
          <SystemBuilderWidget
            currentUser={currentUser}
            currentSession={studioSession}
            role={canManage ? 'gm' : 'player'}
          />
        ) : null}
        {!isLoading && !studioSession ? <p style={{ margin: 0 }}>Aucun système disponible pour le moment.</p> : null}
      </section>
    </Layout>
  );
}
