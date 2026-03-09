import { useEffect, useState } from 'react';
import { documentRepository } from '../../../data/repositories';
import { Document } from '../../../types/document';
import { Session } from '../../../types/session';
import { User } from '../../../types/user';

type DocumentsWidgetProps = {
  currentUser: User;
  currentSession: Session;
  role: 'gm' | 'player';
};

export default function DocumentsWidget({ currentUser, currentSession, role }: DocumentsWidgetProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      try {
        const localDocuments = await documentRepository.listForSession({
          sessionId: currentSession.id,
          currentUserId: currentUser.id,
          role
        });
        if (isMounted) {
          setDocuments(localDocuments);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les documents.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [currentSession.id, currentUser.id, role]);

  const handleMarkAsRead = async (documentId: string) => {
    try {
      await documentRepository.markAsRead(documentId, currentUser.id);
      setDocuments((previous) =>
        previous.map((document) =>
          document.id === documentId
            ? { ...document, readByUserIds: Array.from(new Set([...(document.readByUserIds ?? []), currentUser.id])) }
            : document
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de marquer ce document comme lu.');
    }
  };

  return (
    <div>
      {isLoading ? <p style={{ margin: 0 }}>Chargement des documents...</p> : null}
      {errorMessage ? (
        <p style={{ color: '#b42318', margin: 0 }}>{errorMessage}</p>
      ) : null}
      {!isLoading && !errorMessage && documents.length === 0 ? (
        <p style={{ margin: 0 }}>Aucun document partage pour cette session.</p>
      ) : null}

      {!isLoading && !errorMessage && documents.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: '1rem', display: 'grid', gap: '0.55rem' }}>
          {documents.map((document) => {
            const isRead = (document.readByUserIds ?? []).includes(currentUser.id);
            return (
              <li key={document.id}>
                <strong>{document.title}</strong> ({document.type}){document.description ? ` - ${document.description}` : ''}
                {role === 'player' && !isRead ? (
                  <button
                    className="button secondary"
                    type="button"
                    style={{ marginLeft: '0.6rem' }}
                    onClick={() => {
                      void handleMarkAsRead(document.id);
                    }}
                  >
                    Marquer comme lu
                  </button>
                ) : null}
                {role === 'player' && isRead ? <span style={{ marginLeft: '0.6rem' }}>Lu</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
