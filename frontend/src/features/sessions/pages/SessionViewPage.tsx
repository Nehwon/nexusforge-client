import { Navigate, useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../hooks/useAuth';
import { Session } from '../../../types/session';
import SessionHeader from '../components/SessionHeader';
import DashboardLayout, { WidgetConfig } from '../../dashboard/components/DashboardLayout';

const mockSessions: Record<string, Session> = {
  'session-1': {
    id: 'session-1',
    systemId: 'sys-dnd5e-like',
    name: 'La Tour Oubliée',
    gmUserId: 'user-gm-1',
    state: 'running',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-07T18:00:00.000Z'
  },
  'session-2': {
    id: 'session-2',
    systemId: 'sys-cyberpunk-like',
    name: 'Neon Ashes',
    gmUserId: 'user-gm-2',
    state: 'planned',
    createdAt: '2026-03-03T20:00:00.000Z',
    updatedAt: '2026-03-06T12:30:00.000Z'
  }
};

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

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const session = mockSessions[sessionId] ?? {
    id: sessionId,
    systemId: 'sys-generic',
    name: `Session ${sessionId}`,
    gmUserId: 'user-gm-1',
    state: 'running' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const role: 'gm' | 'player' =
    currentUser.id === session.gmUserId || currentUser.email.includes('gm') ? 'gm' : 'player';

  return (
    <Layout>
      <SessionHeader sessionName={session.name} sessionState={session.state} role={role} />
      <DashboardLayout
        role={role}
        widgets={role === 'gm' ? gmWidgets : playerWidgets}
        currentUser={currentUser}
        currentSession={session}
      />
    </Layout>
  );
}
