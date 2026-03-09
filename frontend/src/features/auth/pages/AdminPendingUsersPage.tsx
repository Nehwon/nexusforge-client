import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { approveUserService, listPendingUsersService } from '../../../services/authService';
import { User } from '../../../types/user';
import { useAuth } from '../../../hooks/useAuth';

export default function AdminPendingUsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const items = await listPendingUsersService();
        if (isMounted) {
          setUsers(items);
        }
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
      await approveUserService(userId, roles);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Validation impossible.');
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
      <section className="card">
        <h1>Comptes en attente</h1>
        <p>Seuls les comptes avec email validé apparaissent ici.</p>
        {isLoading ? <p>Chargement...</p> : null}
        {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
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
    </Layout>
  );
}
