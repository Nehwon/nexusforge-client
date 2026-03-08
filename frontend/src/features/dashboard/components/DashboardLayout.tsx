import WidgetContainer from './WidgetContainer';
import InitiativeWidget from '../widgets/InitiativeWidget';
import CharacterWidget from '../widgets/CharacterWidget';
import ChatWidget from '../widgets/ChatWidget';
import DocumentsWidget from '../widgets/DocumentsWidget';
import NotesWidget from '../widgets/NotesWidget';

export type WidgetConfig = {
  id: string;
  type: 'initiative' | 'character' | 'chat' | 'documents' | 'notes';
  title: string;
};

type DashboardLayoutProps = {
  role: 'gm' | 'player';
  widgets: WidgetConfig[];
};

function renderWidget(type: WidgetConfig['type']) {
  switch (type) {
    case 'initiative':
      return <InitiativeWidget />;
    case 'character':
      return <CharacterWidget />;
    case 'chat':
      return <ChatWidget />;
    case 'documents':
      return <DocumentsWidget />;
    case 'notes':
      return <NotesWidget />;
    default:
      return null;
  }
}

export default function DashboardLayout({ role, widgets }: DashboardLayoutProps) {
  return (
    <section>
      <p style={{ marginTop: 0 }}>Dashboard {role === 'gm' ? 'MJ' : 'Joueur'}</p>
      <div className="widgets-grid">
        {widgets.map((widget) => (
          <WidgetContainer key={widget.id} title={widget.title}>
            {renderWidget(widget.type)}
          </WidgetContainer>
        ))}
      </div>
    </section>
  );
}
