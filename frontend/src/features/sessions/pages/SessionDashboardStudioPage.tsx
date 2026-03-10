import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { sessionRepository } from '../../../data/repositories';
import DashboardLayout from '../../dashboard/components/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { Session } from '../../../types/session';
import { gmWidgets, playerWidgets } from '../dashboardWidgets';

function canUseGmRole(session: Session, userId: string, userRoles: string[]): boolean {
  return (
    userId === session.gmUserId ||
    (session.gmUserIds || []).includes(userId) ||
    userRoles.includes('gm') ||
    userRoles.includes('admin')
  );
}

export default function SessionDashboardStudioPage() {
  const { sessionId = '' } = useParams();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const loaded = await sessionRepository.getById(sessionId);
        if (isMounted) {
          setSession(loaded);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger la partie.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSession();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <Layout>
        <section className="card">Chargement du studio d interface...</section>
      </Layout>
    );
  }

  if (errorMessage) {
    return (
      <Layout>
        <section className="card" style={{ color: '#b42318' }}>
          {errorMessage}
        </section>
      </Layout>
    );
  }

  if (!session) {
    return <Navigate to="/sessions" replace />;
  }

  const gmAllowed = canUseGmRole(session, currentUser.id, currentUser.roles);
  const requestedRole = searchParams.get('role');
  const role: 'gm' | 'player' = requestedRole === 'player' ? 'player' : gmAllowed ? 'gm' : 'player';

  const roleWidgets = role === 'gm' ? gmWidgets : playerWidgets;

  return (
    <Layout wide>
      <section className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Studio d ecran de partie</h1>
            <p style={{ margin: 0 }}>
              Partie: <strong>{session.name}</strong> | Role edite: <strong>{role === 'gm' ? 'MJ' : 'Joueur'}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {gmAllowed ? (
              <>
                <Link className="button secondary" to={`/sessions/${session.id}/studio?role=gm`}>
                  Studio MJ
                </Link>
                <Link className="button secondary" to={`/sessions/${session.id}/studio?role=player`}>
                  Studio Joueur
                </Link>
              </>
            ) : null}
            <Link className="button" to={`/sessions/${session.id}`}>
              Retour partie
            </Link>
          </div>
        </div>
      </section>

      <DashboardLayout role={role} widgets={roleWidgets} currentUser={currentUser} currentSession={session} studioMode />
    </Layout>
  );
}
