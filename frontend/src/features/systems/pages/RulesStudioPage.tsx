import { useEffect, useMemo, useState } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import { systemRepository } from '../../../data/repositories';
import { GameSystem } from '../../../types/system';
import Button from '../../../components/Button';
import SystemBuilderWidget from '../../dashboard/widgets/SystemBuilderWidget';
import { Session } from '../../../types/session';

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
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [newSystemName, setNewSystemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canManage = Boolean(currentUser && (currentUser.roles.includes('gm') || currentUser.roles.includes('admin')));

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
      setSelectedSystemId('');
      return;
    }
    const availableSystems = await systemRepository.listAvailableForUser(currentUser);
    setSystems(availableSystems);
    setSelectedSystemId((current) => current || availableSystems[0]?.id || '');
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        if (!currentUser) {
          return;
        }
        const availableSystems = await systemRepository.listAvailableForUser(currentUser);
        if (!isMounted) {
          return;
        }
        setSystems(availableSystems);
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
  }, [currentUser]);

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
