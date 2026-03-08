import WidgetContainer from './WidgetContainer';
import InitiativeWidget from '../widgets/InitiativeWidget';
import CharacterWidget, { mockSteamShadowsSheet } from '../widgets/CharacterWidget';
import ChatWidget from '../widgets/ChatWidget';
import DocumentsWidget from '../widgets/DocumentsWidget';
import NotesWidget from '../widgets/NotesWidget';
import { Session } from '../../../types/session';
import { User } from '../../../types/user';

export type WidgetConfig = {
  id: string;
  type: 'initiative' | 'character' | 'chat' | 'documents' | 'notes';
  title: string;
};

type DashboardLayoutProps = {
  role: 'gm' | 'player';
  widgets: WidgetConfig[];
  currentUser: User;
  currentSession: Session;
};

function renderWidget(type: WidgetConfig['type'], context: Omit<DashboardLayoutProps, 'widgets'>) {
  switch (type) {
    case 'initiative':
      return <InitiativeWidget />;
    case 'character':
      return <CharacterWidget sheet={mockSteamShadowsSheet} />;
    case 'chat':
      return <ChatWidget currentUser={context.currentUser} currentSession={context.currentSession} role={context.role} />;
    case 'documents':
      return <DocumentsWidget />;
    case 'notes':
      return <NotesWidget />;
    default:
      return null;
  }
}

export default function DashboardLayout({ role, widgets, currentUser, currentSession }: DashboardLayoutProps) {
  return (
    <section>
      <p style={{ marginTop: 0 }}>Dashboard {role === 'gm' ? 'MJ' : 'Joueur'}</p>
      <div className="widgets-grid">
        {widgets.map((widget) => (
          <WidgetContainer key={widget.id} title={widget.title}>
            {renderWidget(widget.type, { role, currentUser, currentSession })}
          </WidgetContainer>
        ))}
      </div>
    </section>
  );
}
