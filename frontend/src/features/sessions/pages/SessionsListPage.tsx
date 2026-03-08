import { Link } from 'react-router-dom';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { Session } from '../../../types/session';

const mockSessions: Session[] = [
  {
    id: 'session-1',
    systemId: 'sys-dnd5e-like',
    name: 'La Tour Oubliée',
    description: 'Exploration et intrigue dans les ruines de Merovia.',
    gmUserId: 'user-gm-1',
    state: 'running',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-07T18:00:00.000Z'
  },
  {
    id: 'session-2',
    systemId: 'sys-cyberpunk-like',
    name: 'Neon Ashes',
    description: 'Opération de récupération dans les bas-fonds de New Marseille.',
    gmUserId: 'user-gm-2',
    state: 'planned',
    createdAt: '2026-03-03T20:00:00.000Z',
    updatedAt: '2026-03-06T12:30:00.000Z'
  }
];

export default function SessionsListPage() {
  const { currentUser, logout } = useAuth();

  return (
    <Layout>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Sessions</h1>
          <p style={{ marginTop: 0 }}>Connecté en tant que {currentUser?.displayName}</p>
        </div>
        <Button variant="secondary" onClick={logout}>
          Se déconnecter
        </Button>
      </header>

      <section className="grid">
        {mockSessions.map((session) => (
          <article key={session.id} className="card">
            <h2 style={{ marginTop: 0 }}>{session.name}</h2>
            <p>{session.description}</p>
            <p>
              État: <strong>{session.state}</strong>
            </p>
            <Link to={`/sessions/${session.id}`}>Ouvrir la session</Link>
          </article>
        ))}
      </section>
    </Layout>
  );
}
