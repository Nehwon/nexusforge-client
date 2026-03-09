import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import { Session } from '../../../types/session';
import { sessionRepository } from '../../../data/repositories';

export default function SessionsListPage() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      try {
        const localSessions = await sessionRepository.list();
        if (isMounted) {
          setSessions(localSessions);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les sessions.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout>
      <header>
        <h1>Sessions</h1>
        <p style={{ marginTop: 0 }}>Connecté en tant que {currentUser?.displayName}</p>
      </header>

      <section className="grid">
        {isLoading ? <article className="card">Chargement des sessions...</article> : null}
        {errorMessage ? (
          <article className="card" style={{ color: '#b42318' }}>
            {errorMessage}
          </article>
        ) : null}
        {!isLoading && !errorMessage && sessions.length === 0 ? (
          <article className="card">Aucune session locale disponible.</article>
        ) : null}
        {!isLoading && !errorMessage
          ? sessions.map((session) => (
              <article key={session.id} className="card">
                <h2 style={{ marginTop: 0 }}>{session.name}</h2>
                <p>{session.description ?? 'Aucune description'}</p>
                <p>
                  État: <strong>{session.state}</strong>
                </p>
                <Link to={`/sessions/${session.id}`}>Ouvrir la session</Link>
              </article>
            ))
          : null}
      </section>
    </Layout>
  );
}
