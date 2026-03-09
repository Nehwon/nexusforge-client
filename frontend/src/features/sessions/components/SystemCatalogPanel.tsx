import { useEffect, useMemo, useState } from 'react';
import { sessionRepository, systemRepository } from '../../../data/repositories';
import { Session } from '../../../types/session';
import { GameSystem } from '../../../types/system';
import { User } from '../../../types/user';

type SystemCatalogPanelProps = {
  currentUser: User;
  currentSession: Session;
  role: 'gm' | 'player';
  onSessionChange: (session: Session) => void;
};

function canManageSystems(role: 'gm' | 'player', user: User): boolean {
  return role === 'gm' || user.roles.includes('admin');
}

export default function SystemCatalogPanel({ currentUser, currentSession, role, onSessionChange }: SystemCatalogPanelProps) {
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState(currentSession.systemId);
  const [newSystemName, setNewSystemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canManage = canManageSystems(role, currentUser);

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === selectedSystemId) ?? null,
    [selectedSystemId, systems]
  );

  const reloadSystems = async () => {
    const availableSystems = await systemRepository.listAvailableForUser(currentUser);
    setSystems(availableSystems);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadSystems() {
      try {
        const availableSystems = await systemRepository.listAvailableForUser(currentUser);
        if (!isMounted) {
          return;
        }
        setSystems(availableSystems);
        setSelectedSystemId(currentSession.systemId);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les systemes.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSystems();

    return () => {
      isMounted = false;
    };
  }, [currentSession.systemId, currentUser]);

  const bindSystemToSession = async (systemId: string) => {
    if (!canManage) {
      return;
    }

    const nextSession: Session = {
      ...currentSession,
      systemId,
      updatedAt: new Date().toISOString()
    };

    await sessionRepository.upsert(nextSession);
    onSessionChange(nextSession);
    setSelectedSystemId(systemId);
    setStatusMessage('Systeme de jeu associe a la session.');
    window.dispatchEvent(new CustomEvent('system-updated', { detail: { systemId } }));
  };

  const handleSelectSystem = async (systemId: string) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      await bindSystemToSession(systemId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de changer le systeme de session.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSystem = async () => {
    if (!canManage) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      const created = await systemRepository.create({
        owner: currentUser,
        name: newSystemName.trim() || 'Nouveau systeme',
        templateFromSystemId: currentSession.systemId,
        visibility: 'private'
      });

      await reloadSystems();
      await bindSystemToSession(created.id);
      setNewSystemName('');
      setStatusMessage('Nouveau systeme cree et associe a la session.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de creer le systeme.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateSystem = async () => {
    if (!canManage || !selectedSystem) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      const duplicated = await systemRepository.duplicate({
        sourceSystemId: selectedSystem.id,
        actor: currentUser,
        name: `${selectedSystem.name} (copie ${currentUser.displayName})`
      });

      await reloadSystems();
      await bindSystemToSession(duplicated.id);
      setStatusMessage('Systeme duplique et associe a la session.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de dupliquer le systeme.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <section className="card">Chargement du catalogue des systemes...</section>;
  }

  return (
    <section className="card system-catalog-panel">
      <div className="system-catalog-panel__header">
        <h2 style={{ margin: 0 }}>Systemes disponibles</h2>
        {!canManage ? <span>Lecture seule</span> : null}
      </div>

      <label style={{ display: 'grid', gap: '0.35rem' }}>
        <span>Systeme actif pour la session</span>
        <select
          value={selectedSystemId}
          onChange={(event) => {
            void handleSelectSystem(event.target.value);
          }}
          disabled={!canManage || isSaving}
        >
          {systems.map((system) => (
            <option key={system.id} value={system.id}>
              {system.name} - owner: {system.ownerUserId} ({system.visibility})
            </option>
          ))}
        </select>
      </label>

      {selectedSystem ? (
        <p style={{ margin: 0 }}>
          Edition: <strong>{selectedSystem.ownerUserId === currentUser.id || currentUser.roles.includes('admin') ? 'autorisee' : 'interdite'}</strong>
        </p>
      ) : null}

      {canManage ? (
        <div className="system-catalog-panel__actions">
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Creer un systeme (copie de base de la session actuelle)</span>
            <input
              type="text"
              value={newSystemName}
              onChange={(event) => setNewSystemName(event.target.value)}
              placeholder="Nom du systeme"
            />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="button secondary" type="button" onClick={() => void handleCreateSystem()} disabled={isSaving}>
              Creer mon systeme
            </button>
            <button className="button secondary" type="button" onClick={() => void handleDuplicateSystem()} disabled={isSaving || !selectedSystem}>
              Dupliquer le systeme actif
            </button>
          </div>
        </div>
      ) : null}

      {statusMessage ? <p style={{ margin: 0, color: '#067647' }}>{statusMessage}</p> : null}
      {errorMessage ? <p style={{ margin: 0, color: '#b42318' }}>{errorMessage}</p> : null}
    </section>
  );
}
