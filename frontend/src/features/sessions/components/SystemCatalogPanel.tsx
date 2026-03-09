import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canManage = canManageSystems(role, currentUser);

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === selectedSystemId) ?? null,
    [selectedSystemId, systems]
  );

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
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les systèmes.');
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
    setStatusMessage('Système de règles associé à la partie.');
    window.dispatchEvent(new CustomEvent('system-updated', { detail: { systemId } }));
  };

  const handleSelectSystem = async (systemId: string) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      await bindSystemToSession(systemId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de changer le système de la partie.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <section className="card">Chargement du catalogue des systèmes...</section>;
  }

  return (
    <section className="card system-catalog-panel">
      <div className="system-catalog-panel__header">
        <h2 style={{ margin: 0 }}>Système de règles de la partie</h2>
        {!canManage ? <span>Lecture seule</span> : null}
      </div>

      <label style={{ display: 'grid', gap: '0.35rem' }}>
        <span>Système actif pour cette partie</span>
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
          Édition: <strong>{selectedSystem.ownerUserId === currentUser.id || currentUser.roles.includes('admin') ? 'autorisée' : 'interdite'}</strong>
        </p>
      ) : null}

      {canManage ? (
        <p style={{ margin: 0 }}>
          Pour créer/dupliquer/éditer visuellement les règles: <Link to="/systems">ouvrir le Studio des règles</Link>.
        </p>
      ) : null}

      {statusMessage ? <p style={{ margin: 0, color: '#067647' }}>{statusMessage}</p> : null}
      {errorMessage ? <p style={{ margin: 0, color: '#b42318' }}>{errorMessage}</p> : null}
    </section>
  );
}
