import { useEffect, useMemo, useState } from 'react';
import { dashboardProfileRepository } from '../../../data/repositories';
import { DashboardProfile, DashboardWidgetSize } from '../../../types/dashboard';
import { Session } from '../../../types/session';
import { User } from '../../../types/user';
import WidgetContainer from './WidgetContainer';
import CharacterWidget from '../widgets/CharacterWidget';
import ChatWidget from '../widgets/ChatWidget';
import DocumentsWidget from '../widgets/DocumentsWidget';
import InitiativeWidget from '../widgets/InitiativeWidget';
import NotesWidget from '../widgets/NotesWidget';

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
      return <InitiativeWidget currentUser={context.currentUser} currentSession={context.currentSession} role={context.role} />;
    case 'character':
      return <CharacterWidget currentUser={context.currentUser} currentSession={context.currentSession} role={context.role} />;
    case 'chat':
      return <ChatWidget currentUser={context.currentUser} currentSession={context.currentSession} role={context.role} />;
    case 'documents':
      return <DocumentsWidget currentUser={context.currentUser} currentSession={context.currentSession} role={context.role} />;
    case 'notes':
      return <NotesWidget currentUser={context.currentUser} currentSession={context.currentSession} role={context.role} />;
    default:
      return null;
  }
}

function buildDefaultSizes(widgetIds: string[]): Record<string, DashboardWidgetSize> {
  return widgetIds.reduce<Record<string, DashboardWidgetSize>>((accumulator, widgetId) => {
    accumulator[widgetId] = 'medium';
    return accumulator;
  }, {});
}

function normalizeProfile(profile: DashboardProfile, availableWidgetIds: string[]): DashboardProfile {
  const available = new Set(availableWidgetIds);

  const keptOrder = profile.widgetOrder.filter((widgetId) => available.has(widgetId));
  const missing = availableWidgetIds.filter((widgetId) => !keptOrder.includes(widgetId));
  const widgetOrder = [...keptOrder, ...missing];

  const hiddenWidgetIds = profile.hiddenWidgetIds.filter((widgetId) => available.has(widgetId));

  const widgetSizes: Record<string, DashboardWidgetSize> = {};
  for (const widgetId of availableWidgetIds) {
    const current = profile.widgetSizes[widgetId];
    widgetSizes[widgetId] = current === 'small' || current === 'medium' || current === 'large' ? current : 'medium';
  }

  return {
    ...profile,
    widgetOrder,
    hiddenWidgetIds,
    widgetSizes
  };
}

function reorder(list: string[], sourceId: string, targetId: string): string[] {
  if (sourceId === targetId) {
    return list;
  }

  const next = [...list];
  const sourceIndex = next.indexOf(sourceId);
  const targetIndex = next.indexOf(targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return list;
  }

  next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, sourceId);
  return next;
}

export default function DashboardLayout({ role, widgets, currentUser, currentSession }: DashboardLayoutProps) {
  const [profiles, setProfiles] = useState<DashboardProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dropTargetWidgetId, setDropTargetWidgetId] = useState<string | null>(null);
  const [profileNameDraft, setProfileNameDraft] = useState('');

  const availableWidgetIds = useMemo(() => widgets.map((widget) => widget.id), [widgets]);
  const widgetById = useMemo(
    () => widgets.reduce<Record<string, WidgetConfig>>((accumulator, widget) => ({ ...accumulator, [widget.id]: widget }), {}),
    [widgets]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles() {
      try {
        const localProfiles = await dashboardProfileRepository.listForUserRole(currentUser.id, role);

        let ensuredProfiles = localProfiles;
        if (ensuredProfiles.length === 0) {
          const created = await dashboardProfileRepository.createProfile({
            userId: currentUser.id,
            role,
            name: role === 'gm' ? 'Interface MJ par defaut' : 'Interface Joueur par defaut',
            widgetIds: availableWidgetIds,
            isFavorite: true
          });
          ensuredProfiles = [created];
        }

        const normalizedProfiles = ensuredProfiles.map((profile) => normalizeProfile(profile, availableWidgetIds));

        await Promise.all(
          normalizedProfiles
            .filter((profile, index) => {
              const previous = ensuredProfiles[index];
              return (
                previous.widgetOrder.join('|') !== profile.widgetOrder.join('|') ||
                previous.hiddenWidgetIds.join('|') !== profile.hiddenWidgetIds.join('|') ||
                JSON.stringify(previous.widgetSizes) !== JSON.stringify(profile.widgetSizes)
              );
            })
            .map((profile) => dashboardProfileRepository.upsert(profile))
        );

        if (isMounted) {
          setProfiles(normalizedProfiles);
          const favorite = normalizedProfiles.find((profile) => profile.isFavorite);
          setSelectedProfileId((current) => current ?? favorite?.id ?? normalizedProfiles[0].id);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les interfaces dashboard.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, [availableWidgetIds, currentUser.id, role]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  useEffect(() => {
    setProfileNameDraft(selectedProfile?.name ?? '');
  }, [selectedProfile?.id, selectedProfile?.name]);

  const visibleWidgets = useMemo(() => {
    if (!selectedProfile) {
      return [];
    }

    const hidden = new Set(selectedProfile.hiddenWidgetIds);
    return selectedProfile.widgetOrder
      .filter((widgetId) => !hidden.has(widgetId))
      .map((widgetId) => widgetById[widgetId])
      .filter((widget): widget is WidgetConfig => Boolean(widget));
  }, [selectedProfile, widgetById]);

  const persistProfile = async (profile: DashboardProfile) => {
    setProfiles((previous) => previous.map((item) => (item.id === profile.id ? profile : item)));
    try {
      await dashboardProfileRepository.upsert(profile);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de sauvegarder le dashboard.');
    }
  };

  const handleToggleWidget = async (widgetId: string) => {
    if (!selectedProfile) {
      return;
    }

    const isHidden = selectedProfile.hiddenWidgetIds.includes(widgetId);
    const hiddenWidgetIds = isHidden
      ? selectedProfile.hiddenWidgetIds.filter((id) => id !== widgetId)
      : [...selectedProfile.hiddenWidgetIds, widgetId];

    await persistProfile({ ...selectedProfile, hiddenWidgetIds });
  };

  const handleWidgetSize = async (widgetId: string, size: DashboardWidgetSize) => {
    if (!selectedProfile) {
      return;
    }

    await persistProfile({
      ...selectedProfile,
      widgetSizes: {
        ...selectedProfile.widgetSizes,
        [widgetId]: size
      }
    });
  };

  const handleDrop = async (targetWidgetId: string) => {
    if (!selectedProfile || !draggedWidgetId) {
      return;
    }

    const widgetOrder = reorder(selectedProfile.widgetOrder, draggedWidgetId, targetWidgetId);
    setDraggedWidgetId(null);
    setDropTargetWidgetId(null);
    await persistProfile({ ...selectedProfile, widgetOrder });
  };

  const handleCommitProfileName = async () => {
    if (!selectedProfile) {
      return;
    }

    const trimmed = profileNameDraft.trim();
    if (!trimmed || trimmed === selectedProfile.name) {
      setProfileNameDraft(selectedProfile.name);
      return;
    }

    await persistProfile({
      ...selectedProfile,
      name: trimmed
    });
  };

  const handleCreateProfile = async (mode: 'blank' | 'duplicate') => {
    try {
      const source = mode === 'duplicate' ? selectedProfile ?? undefined : undefined;
      const created = await dashboardProfileRepository.createProfile({
        userId: currentUser.id,
        role,
        name: `${role === 'gm' ? 'Interface MJ' : 'Interface Joueur'} ${profiles.length + 1}`,
        widgetIds: availableWidgetIds,
        sourceProfile: source,
        isFavorite: false
      });

      setProfiles((previous) => [normalizeProfile(created, availableWidgetIds), ...previous]);
      setSelectedProfileId(created.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de creer un profil dashboard.');
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile || profiles.length <= 1) {
      return;
    }

    try {
      await dashboardProfileRepository.delete(selectedProfile.id);
      const nextProfiles = profiles.filter((profile) => profile.id !== selectedProfile.id);
      setProfiles(nextProfiles);
      setSelectedProfileId(nextProfiles[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de supprimer ce profil.');
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedProfile) {
      return;
    }

    await persistProfile({ ...selectedProfile, isFavorite: !selectedProfile.isFavorite });
  };

  if (isLoading) {
    return <section className="card">Chargement du dashboard...</section>;
  }

  if (errorMessage) {
    return (
      <section className="card" style={{ color: '#b42318' }}>
        {errorMessage}
      </section>
    );
  }

  if (!selectedProfile) {
    return <section className="card">Aucun profil dashboard disponible.</section>;
  }

  return (
    <section>
      <div className="card dashboard-toolbar">
        <p style={{ marginTop: 0 }}>Dashboard {role === 'gm' ? 'MJ' : 'Joueur'} - profil par compte</p>
        <div className="dashboard-toolbar__row">
          <label>
            <span style={{ marginRight: '0.4rem' }}>Interface</span>
            <select
              value={selectedProfile.id}
              onChange={(event) => setSelectedProfileId(event.target.value)}
              style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '0.4rem' }}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} {profile.isFavorite ? '★' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="dashboard-toolbar__name">
            <span>Nom</span>
            <input
              type="text"
              value={profileNameDraft}
              onChange={(event) => setProfileNameDraft(event.target.value)}
              onBlur={() => {
                void handleCommitProfileName();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCommitProfileName();
                }
              }}
            />
          </label>
          <button className="button secondary" type="button" onClick={() => void handleCommitProfileName()}>
            Renommer
          </button>

          <button className="button secondary" type="button" onClick={() => void handleCreateProfile('blank')}>
            Nouvelle interface
          </button>
          <button className="button secondary" type="button" onClick={() => void handleCreateProfile('duplicate')}>
            Dupliquer
          </button>
          <button className="button secondary" type="button" onClick={() => void handleToggleFavorite()}>
            {selectedProfile.isFavorite ? 'Retirer favori' : 'Ajouter favori'}
          </button>
          <button className="button secondary" type="button" onClick={() => void handleDeleteProfile()} disabled={profiles.length <= 1}>
            Supprimer
          </button>
          <button className="button" type="button" onClick={() => setIsEditing((value) => !value)}>
            {isEditing ? 'Fermer edition' : 'Editer modules'}
          </button>
        </div>

        {isEditing ? (
          <div className="dashboard-editor">
            <p style={{ margin: 0 }}>
              Active ou masque les modules, ajuste leur taille, puis glisse-depose les cartes dans la grille pour les repositionner.
            </p>
            <div className="dashboard-editor__list">
              {selectedProfile.widgetOrder.map((widgetId) => {
                const widget = widgetById[widgetId];
                if (!widget) {
                  return null;
                }

                const isVisible = !selectedProfile.hiddenWidgetIds.includes(widgetId);
                return (
                  <div key={widgetId} className="dashboard-editor__item">
                    <label className="dashboard-editor__toggle">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => {
                          void handleToggleWidget(widgetId);
                        }}
                      />
                      <span>{widget.title}</span>
                    </label>
                    <select
                      value={selectedProfile.widgetSizes[widgetId] ?? 'medium'}
                      onChange={(event) => {
                        void handleWidgetSize(widgetId, event.target.value as DashboardWidgetSize);
                      }}
                    >
                      <option value="small">Taille S</option>
                      <option value="medium">Taille M</option>
                      <option value="large">Taille L</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="widgets-grid">
        {visibleWidgets.map((widget) => {
          const size = selectedProfile.widgetSizes[widget.id] ?? 'medium';
          return (
            <div
              key={widget.id}
              className={`dashboard-widget dashboard-widget--${size} ${isEditing ? 'is-editing' : ''} ${
                dropTargetWidgetId === widget.id ? 'is-drop-target' : ''
              }`}
              draggable={isEditing}
              onDragStart={() => {
                setDraggedWidgetId(widget.id);
              }}
              onDragEnd={() => {
                setDraggedWidgetId(null);
                setDropTargetWidgetId(null);
              }}
              onDragEnter={() => {
                if (!isEditing || !draggedWidgetId || draggedWidgetId === widget.id) {
                  return;
                }
                setDropTargetWidgetId(widget.id);
              }}
              onDragLeave={() => {
                if (dropTargetWidgetId === widget.id) {
                  setDropTargetWidgetId(null);
                }
              }}
              onDragOver={(event) => {
                if (!isEditing) {
                  return;
                }
                event.preventDefault();
                if (draggedWidgetId && draggedWidgetId !== widget.id) {
                  setDropTargetWidgetId(widget.id);
                }
              }}
              onDrop={(event) => {
                if (!isEditing) {
                  return;
                }
                event.preventDefault();
                void handleDrop(widget.id);
              }}
            >
              <WidgetContainer title={widget.title}>{renderWidget(widget.type, { role, currentUser, currentSession })}</WidgetContainer>
            </div>
          );
        })}
      </div>
    </section>
  );
}
