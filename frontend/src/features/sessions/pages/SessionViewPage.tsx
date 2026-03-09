import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import { Session } from '../../../types/session';
import SessionHeader from '../components/SessionHeader';
import SystemCatalogPanel from '../components/SystemCatalogPanel';
import PartyAdminPanel from '../components/PartyAdminPanel';
import SyncConflictsPanel from '../components/SyncConflictsPanel';
import SyncStatusPanel from '../components/SyncStatusPanel';
import DashboardLayout, { WidgetConfig } from '../../dashboard/components/DashboardLayout';
import { sessionRepository } from '../../../data/repositories';

const gmWidgets: WidgetConfig[] = [
  { id: 'initiative', type: 'initiative', title: 'Initiative & Combat' },
  { id: 'characters', type: 'character', title: 'Fiches' },
  { id: 'chat', type: 'chat', title: 'Chat & Messages' },
  { id: 'documents', type: 'documents', title: 'Documents' },
  { id: 'notes', type: 'notes', title: 'Notes' }
];

const playerWidgets: WidgetConfig[] = [
  { id: 'my-character', type: 'character', title: 'Mon personnage' },
  { id: 'chat', type: 'chat', title: 'Chat & Messages' },
  { id: 'documents', type: 'documents', title: 'Documents reçus' },
  { id: 'notes', type: 'notes', title: 'Notes & Journal' }
];

export default function SessionViewPage() {
  const { sessionId = '' } = useParams();
  const { currentUser } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const localSession = await sessionRepository.getById(sessionId);
        if (isMounted) {
          setSession(localSession);
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

  if (isLoading) {
    return (
      <Layout>
        <section className="card">Chargement de la partie...</section>
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

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role: 'gm' | 'player' =
    currentUser.id === session.gmUserId ||
    (session.gmUserIds || []).includes(currentUser.id) ||
    currentUser.roles.includes('gm') ||
    currentUser.roles.includes('admin')
      ? 'gm'
      : 'player';

  return (
    <Layout>
      <SessionHeader sessionName={session.name} sessionState={session.state} role={role} />
      <PartyAdminPanel session={session} currentUser={currentUser} onSessionChange={(nextSession) => setSession(nextSession)} />
      <SystemCatalogPanel
        currentUser={currentUser}
        currentSession={session}
        role={role}
        onSessionChange={(nextSession) => setSession(nextSession)}
      />
      <SyncStatusPanel />
      <SyncConflictsPanel />
      <DashboardLayout
        role={role}
        widgets={role === 'gm' ? gmWidgets : playerWidgets}
        currentUser={currentUser}
        currentSession={session}
      />
    </Layout>
  );
}
