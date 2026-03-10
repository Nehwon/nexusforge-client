import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { approveUserService, listPendingUsersService } from '../../../services/authService';
import { User } from '../../../types/user';
import { useAuth } from '../../../hooks/useAuth';
import { systemRepository } from '../../../data/repositories';
import { GameSystem } from '../../../types/system';

type AdminSystemUsage = GameSystem & {
  usage: {
    usersUsingNow: number;
    activeSessionsCount: number;
    archivedSessionsCount: number;
    totalSessionsCount: number;
    lastUsedAt: string | null;
  };
};

export default function AdminPendingUsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [usage, setUsage] = useState<AdminSystemUsage[]>([]);
  const [replacementBySystemId, setReplacementBySystemId] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadData = async () => {
    const [pendingUsers, systemsUsage] = await Promise.all([listPendingUsersService(), systemRepository.listUsageForAdmin()]);
    setUsers(pendingUsers);
    setUsage(systemsUsage as AdminSystemUsage[]);
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        await loadData();
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.');
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
  }, []);

  const approveAs = async (userId: string, roles: string[]) => {
    try {
      setError(null);
      await approveUserService(userId, roles);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Validation impossible.');
    }
  };

  const deleteSystem = async (systemId: string) => {
    const target = usage.find((item) => item.id === systemId);
    if (!target) {
      return;
    }

    const replacementSystemId =
      replacementBySystemId[systemId] || usage.find((candidate) => candidate.id !== systemId)?.id || '';

    if (!replacementSystemId) {
      setError('Aucun système de remplacement disponible.');
      return;
    }

    const replacementName = usage.find((candidate) => candidate.id === replacementSystemId)?.name || replacementSystemId;
    const confirmed = window.confirm(
      `Supprimer le système "${target.name}" ? Les parties liées seront migrées vers "${replacementName}".`
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setStatus(null);
    setIsDeleting(true);

    try {
      const result = await systemRepository.deleteAsAdmin({
        systemId,
        replacementSystemId
      });
      await loadData();
      setStatus(`Système supprimé. Parties migrées: ${result.migratedSessionsCount}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Suppression impossible.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentUser?.roles.includes('admin')) {
    return (
      <Layout>
        <section className="card">Accès admin requis.</section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="card" style={{ marginBottom: '1rem' }}>
        <h1>Comptes en attente</h1>
        <p>Seuls les comptes avec email validé apparaissent ici.</p>
        {isLoading ? <p>Chargement...</p> : null}
        {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
        {status ? <p style={{ color: '#067647' }}>{status}</p> : null}
        {!isLoading && users.length === 0 ? <p>Aucun compte à valider.</p> : null}

        <div className="grid">
          {users.map((user) => (
            <article key={user.id} className="card">
              <h2 style={{ marginTop: 0 }}>{user.displayName}</h2>
              <p style={{ margin: 0 }}>{user.email}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <Button onClick={() => approveAs(user.id, ['player'])}>Valider Joueur</Button>
                <Button variant="secondary" onClick={() => approveAs(user.id, ['gm', 'player'])}>
                  Valider MJ
                </Button>
                <Button variant="secondary" onClick={() => approveAs(user.id, ['admin', 'gm', 'player'])}>
                  Valider Admin
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Usage des systèmes</h2>
        {!isLoading && usage.length === 0 ? <p>Aucun système.</p> : null}
        <div className="grid">
          {usage.map((item) => (
            <article key={item.id} className="card">
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{item.name}</h3>
              <p style={{ marginTop: 0, marginBottom: '0.45rem' }}>{item.description || 'Aucune description'}</p>
              <p style={{ margin: 0 }}>Utilisateurs actifs actuellement: {item.usage.usersUsingNow}</p>
              <p style={{ margin: 0 }}>Parties actives: {item.usage.activeSessionsCount}</p>
              <p style={{ margin: 0 }}>Parties archivées: {item.usage.archivedSessionsCount}</p>
              <p style={{ margin: 0 }}>Total parties: {item.usage.totalSessionsCount}</p>
              <p style={{ margin: 0 }}>
                Dernière utilisation: {item.usage.lastUsedAt ? new Date(item.usage.lastUsedAt).toLocaleString() : 'Jamais'}
              </p>

              <label style={{ display: 'grid', gap: '0.35rem', marginTop: '0.6rem' }}>
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
                  {usage
                    .filter((candidate) => candidate.id !== item.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                </select>
              </label>

              <div style={{ marginTop: '0.6rem' }}>
                <Button type="button" variant="secondary" onClick={() => void deleteSystem(item.id)} disabled={isDeleting}>
                  Supprimer ce système
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
}
