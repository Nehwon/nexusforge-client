import { useEffect, useMemo, useState } from 'react';
import { noteRepository } from '../../../data/repositories';
import { Note } from '../../../types/note';
import { Session } from '../../../types/session';
import { User } from '../../../types/user';

type NotesWidgetProps = {
  currentUser: User;
  currentSession: Session;
  role: 'gm' | 'player';
};

export default function NotesWidget({ currentUser, currentSession, role }: NotesWidgetProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      try {
        const localNotes = await noteRepository.listForSession({
          sessionId: currentSession.id,
          currentUserId: currentUser.id,
          role
        });
        if (isMounted) {
          setNotes(localNotes);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les notes.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      isMounted = false;
    };
  }, [currentSession.id, currentUser.id, role]);

  const grouped = useMemo(
    () => ({
      publicNotes: notes.filter((note) => note.type === 'public'),
      gmPrivateNotes: notes.filter((note) => note.type === 'gm_private'),
      playerPrivateNotes: notes.filter((note) => note.type === 'player_private')
    }),
    [notes]
  );

  return (
    <div>
      {isLoading ? <p style={{ margin: 0 }}>Chargement des notes...</p> : null}
      {errorMessage ? (
        <p style={{ color: '#b42318', margin: 0 }}>{errorMessage}</p>
      ) : null}
      {!isLoading && !errorMessage && notes.length === 0 ? (
        <p style={{ margin: 0 }}>Aucune note pour cette session.</p>
      ) : null}

      {!isLoading && !errorMessage && notes.length > 0 ? (
        <div style={{ display: 'grid', gap: '0.7rem' }}>
          {grouped.publicNotes.length > 0 ? (
            <section>
              <strong>Notes publiques</strong>
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem' }}>
                {grouped.publicNotes.map((note) => (
                  <li key={note.id}>
                    <strong>{note.title ?? 'Sans titre'}</strong>: {note.content}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {role === 'gm' && grouped.gmPrivateNotes.length > 0 ? (
            <section>
              <strong>Notes privees MJ</strong>
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem' }}>
                {grouped.gmPrivateNotes.map((note) => (
                  <li key={note.id}>
                    <strong>{note.title ?? 'Sans titre'}</strong>: {note.content}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {grouped.playerPrivateNotes.length > 0 ? (
            <section>
              <strong>Mes notes privees</strong>
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1rem' }}>
                {grouped.playerPrivateNotes.map((note) => (
                  <li key={note.id}>
                    <strong>{note.title ?? 'Sans titre'}</strong>: {note.content}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
