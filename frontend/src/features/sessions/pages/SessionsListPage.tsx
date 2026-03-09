import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { Session } from '../../../types/session';
import { sessionRepository, systemRepository } from '../../../data/repositories';
import { GameSystem } from '../../../types/system';
import { useI18n } from '../../../hooks/useI18n';

const DEFAULT_TEMPLATE: NonNullable<Session['settings']> = {
  allowPlayerToEditCharacterOffline: true,
  allowPlayerToPlayerChat: true,
  allowPlayerToPlayerDocuments: true,
  silenceMode: 'off'
};

function canDeleteSession(session: Session, userId: string | undefined, isAdmin: boolean): boolean {
  if (!userId) {
    return false;
  }
  if (isAdmin) {
    return true;
  }

  return session.ownerUserId === userId || session.gmUserId === userId;
}

function canManageSession(session: Session, userId: string | undefined, isAdmin: boolean): boolean {
  if (!userId) {
    return false;
  }
  if (isAdmin) {
    return true;
  }
  return session.ownerUserId === userId || session.gmUserId === userId || (session.gmUserIds || []).includes(userId);
}

export default function SessionsListPage() {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [systemIdDraft, setSystemIdDraft] = useState('');
  const [settingsDraft, setSettingsDraft] = useState<NonNullable<Session['settings']>>(DEFAULT_TEMPLATE);

  const isAdmin = Boolean(currentUser?.roles.includes('admin'));

  const selectedSystemName = useMemo(() => {
    const byId = new Map(systems.map((system) => [system.id, system.name]));
    return (systemId: string) => byId.get(systemId) ?? systemId;
  }, [systems]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [localSessions, availableSystems] = await Promise.all([
          sessionRepository.list({ includeArchived }),
          currentUser ? systemRepository.listAvailableForUser(currentUser) : Promise.resolve([])
        ]);

        if (!isMounted) {
          return;
        }

        setSessions(localSessions);
        setSystems(availableSystems);
        setSystemIdDraft((current) => current || availableSystems[0]?.id || '');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les parties.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, includeArchived]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || !systemIdDraft) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      const created = await sessionRepository.create({
        name: nameDraft,
        description: descriptionDraft,
        systemId: systemIdDraft,
        ownerUserId: currentUser.id,
        settings: settingsDraft
      });
      setSessions((previous) => [created, ...previous]);
      setNameDraft('');
      setDescriptionDraft('');
      setSettingsDraft(DEFAULT_TEMPLATE);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de créer la partie.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async (session: Session) => {
    try {
      const updated = await sessionRepository.archive(session.id);
      if (!updated) {
        return;
      }
      setSessions((previous) => previous.map((item) => (item.id === updated.id ? updated : item)).filter((item) => includeArchived || !item.archivedAt));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Archivage impossible.');
    }
  };

  const handleRestore = async (session: Session) => {
    try {
      const updated = await sessionRepository.restore(session.id);
      if (!updated) {
        return;
      }
      setSessions((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Restauration impossible.');
    }
  };

  const handleDelete = async (session: Session) => {
    if (!currentUser) {
      return;
    }

    const confirmed = window.confirm(`Suppression définitive de "${session.name}" ?`);
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);

    try {
      await sessionRepository.remove(session);
      setSessions((previous) => previous.filter((item) => item.id !== session.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de supprimer la partie.');
    }
  };

  return (
    <Layout>
      <header>
        <h1>{t('parties.title')}</h1>
        <p style={{ marginTop: 0 }}>
          {t('parties.connectedAs')} {currentUser?.displayName}
        </p>
      </header>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>{t('parties.create.title')}</h2>
        <form className="form" onSubmit={handleCreate}>
          <label htmlFor="party-name">{t('parties.create.name')}</label>
          <input
            id="party-name"
            type="text"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            placeholder="Chroniques de Nexus"
            required
          />

          <label htmlFor="party-description">{t('parties.create.description')}</label>
          <input
            id="party-description"
            type="text"
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            placeholder="Optionnelle"
          />

          <label htmlFor="party-system">{t('parties.create.system')}</label>
          <select
            id="party-system"
            value={systemIdDraft}
            onChange={(event) => setSystemIdDraft(event.target.value)}
            disabled={systems.length === 0}
          >
            {systems.length === 0 ? <option value="">Aucun système disponible</option> : null}
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>

          <strong>Template générique (modifiable)</strong>
          <label>
            <input
              type="checkbox"
              checked={Boolean(settingsDraft.allowPlayerToEditCharacterOffline)}
              onChange={(event) =>
                setSettingsDraft((previous) => ({
                  ...previous,
                  allowPlayerToEditCharacterOffline: event.target.checked
                }))
              }
            />{' '}
            Joueurs: édition fiche hors-ligne
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(settingsDraft.allowPlayerToPlayerChat)}
              onChange={(event) =>
                setSettingsDraft((previous) => ({
                  ...previous,
                  allowPlayerToPlayerChat: event.target.checked
                }))
              }
            />{' '}
            Joueurs: chat entre joueurs
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(settingsDraft.allowPlayerToPlayerDocuments)}
              onChange={(event) =>
                setSettingsDraft((previous) => ({
                  ...previous,
                  allowPlayerToPlayerDocuments: event.target.checked
                }))
              }
            />{' '}
            Joueurs: documents entre joueurs
          </label>
          <label htmlFor="silenceMode">Mode silence</label>
          <select
            id="silenceMode"
            value={settingsDraft.silenceMode || 'off'}
            onChange={(event) =>
              setSettingsDraft((previous) => ({
                ...previous,
                silenceMode: event.target.value as NonNullable<Session['settings']>['silenceMode']
              }))
            }
          >
            <option value="off">Off</option>
            <option value="noGlobal">No Global</option>
            <option value="playersToPlayersBlocked">Players ↔ Players bloqué</option>
            <option value="full">Full</option>
          </select>

          <Button type="submit" disabled={isCreating || !systemIdDraft}>
            {isCreating ? '...' : t('parties.create.cta')}
          </Button>
        </form>
      </section>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
          <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
          Afficher les parties archivées
        </label>
      </section>

      <section className="grid">
        {isLoading ? <article className="card">{t('parties.loading')}</article> : null}
        {errorMessage ? (
          <article className="card" style={{ color: '#b42318' }}>
            {errorMessage}
          </article>
        ) : null}
        {!isLoading && !errorMessage && sessions.length === 0 ? <article className="card">{t('parties.empty')}</article> : null}
        {!isLoading && !errorMessage
          ? sessions.map((session) => (
              <article key={session.id} className="card" style={{ opacity: session.archivedAt ? 0.78 : 1 }}>
                <h2 style={{ marginTop: 0 }}>{session.name}</h2>
                <p>{session.description ?? 'Aucune description'}</p>
                <p>
                  État: <strong>{session.state}</strong>
                </p>
                <p style={{ marginTop: 0 }}>Système: {selectedSystemName(session.systemId)}</p>
                <p style={{ marginTop: 0 }}>
                  Propriétaire: <strong>{session.ownerUserId ?? session.gmUserId}</strong> | MJ: {(session.gmUserIds || [session.gmUserId]).join(', ')}
                </p>
                {session.archivedAt ? <p style={{ color: '#475467' }}>Archivée le {new Date(session.archivedAt).toLocaleString()}</p> : null}
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link to={`/sessions/${session.id}`}>{t('parties.open')}</Link>
                  {canManageSession(session, currentUser?.id, isAdmin) && !session.archivedAt ? (
                    <button className="button secondary" type="button" onClick={() => void handleArchive(session)}>
                      Archiver
                    </button>
                  ) : null}
                  {canManageSession(session, currentUser?.id, isAdmin) && session.archivedAt ? (
                    <button className="button secondary" type="button" onClick={() => void handleRestore(session)}>
                      Restaurer
                    </button>
                  ) : null}
                  {canDeleteSession(session, currentUser?.id, isAdmin) ? (
                    <button className="button secondary" type="button" onClick={() => void handleDelete(session)}>
                      Suppression définitive
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          : null}
      </section>
    </Layout>
  );
}
