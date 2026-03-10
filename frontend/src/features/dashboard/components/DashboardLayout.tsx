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
import SystemBuilderWidget from '../widgets/SystemBuilderWidget';

export type WidgetConfig = {
  id: string;
  type: 'initiative' | 'character' | 'chat' | 'documents' | 'notes' | 'system-builder';
  title: string;
};

type DashboardLayoutProps = {
  role: 'gm' | 'player';
  widgets: WidgetConfig[];
  currentUser: User;
  currentSession: Session;
  studioMode?: boolean;
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
    case 'system-builder':
      return <SystemBuilderWidget currentUser={context.currentUser} currentSession={context.currentSession} role={context.role} />;
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

export default function DashboardLayout({ role, widgets, currentUser, currentSession, studioMode = false }: DashboardLayoutProps) {
  const [profiles, setProfiles] = useState<DashboardProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
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
        const localProfiles = await dashboardProfileRepository.listForUserRole(currentUser.id, role, currentSession.id);

        let ensuredProfiles = localProfiles;
        if (ensuredProfiles.length === 0) {
          const created = await dashboardProfileRepository.createProfile({
            userId: currentUser.id,
            role,
            sessionId: currentSession.id,
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
  }, [availableWidgetIds, currentSession.id, currentUser.id, role]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  useEffect(() => {
    setProfileNameDraft(selectedProfile?.name ?? '');
  }, [selectedProfile?.id, selectedProfile?.name]);

  useEffect(() => {
    if (!selectedProfile) {
      setSelectedWidgetId(null);
      return;
    }
    const existing = new Set(selectedProfile.widgetOrder);
    setSelectedWidgetId((current) => {
      if (current && existing.has(current)) {
        return current;
      }
      return selectedProfile.widgetOrder[0] ?? null;
    });
  }, [selectedProfile?.id, selectedProfile?.widgetOrder]);

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

  const setWidgetVisibility = async (widgetId: string, visible: boolean) => {
    if (!selectedProfile) {
      return;
    }
    const hiddenSet = new Set(selectedProfile.hiddenWidgetIds);
    if (visible) {
      hiddenSet.delete(widgetId);
    } else {
      hiddenSet.add(widgetId);
    }
    await persistProfile({
      ...selectedProfile,
      hiddenWidgetIds: Array.from(hiddenSet)
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
        sessionId: currentSession.id,
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

  const handleSelectWidget = (widgetId: string) => {
    setSelectedWidgetId(widgetId);
  };

  const moveSelectedWidget = async (direction: 'up' | 'down') => {
    if (!selectedProfile || !selectedWidgetId) {
      return;
    }
    const currentIndex = selectedProfile.widgetOrder.indexOf(selectedWidgetId);
    if (currentIndex < 0) {
      return;
    }
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= selectedProfile.widgetOrder.length) {
      return;
    }
    const order = [...selectedProfile.widgetOrder];
    order.splice(currentIndex, 1);
    order.splice(nextIndex, 0, selectedWidgetId);
    await persistProfile({ ...selectedProfile, widgetOrder: order });
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

  const activeWidgetId = selectedWidgetId ?? selectedProfile.widgetOrder[0] ?? null;
  const activeWidget = activeWidgetId ? widgetById[activeWidgetId] : null;
  const activeIsVisible = activeWidgetId ? !selectedProfile.hiddenWidgetIds.includes(activeWidgetId) : false;
  const effectiveEditing = studioMode ? true : isEditing;

  return (
    <section>
      <div className="card dashboard-toolbar">
        <p style={{ marginTop: 0 }}>
          {studioMode ? 'Studio d ecran' : 'Dashboard'} {role === 'gm' ? 'MJ' : 'Joueur'} - profil par compte
        </p>
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
          {!studioMode ? (
            <button className="button" type="button" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? 'Fermer edition' : 'Editer modules'}
            </button>
          ) : null}
        </div>

        {!studioMode && isEditing ? (
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

      {studioMode ? (
        <section className="dashboard-studio card">
          <aside className="dashboard-studio__panel">
            <h3 style={{ marginTop: 0 }}>Palette modules</h3>
            <p style={{ marginTop: 0, fontSize: '0.9rem' }}>Affiche/masque les modules et clique pour editer leurs proprietes.</p>
            <div className="dashboard-studio__palette">
              {widgets.map((widget) => {
                const isVisible = !selectedProfile.hiddenWidgetIds.includes(widget.id);
                return (
                  <button
                    key={`palette-${widget.id}`}
                    className={`button secondary ${activeWidgetId === widget.id ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => {
                      handleSelectWidget(widget.id);
                    }}
                    style={{ textAlign: 'left' }}
                  >
                    {widget.title} {isVisible ? '●' : '○'}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="dashboard-studio__panel">
            <h3 style={{ marginTop: 0 }}>Canvas des modules</h3>
            <p style={{ marginTop: 0, fontSize: '0.9rem' }}>Glisse-depose pour reordonner. Clique une carte pour la configurer.</p>
            <div className="dashboard-studio__canvas">
              {selectedProfile.widgetOrder.map((widgetId) => {
                const widget = widgetById[widgetId];
                if (!widget) {
                  return null;
                }
                const size = selectedProfile.widgetSizes[widget.id] ?? 'medium';
                const hidden = selectedProfile.hiddenWidgetIds.includes(widget.id);
                return (
                  <article
                    key={`studio-order-${widget.id}`}
                    className={`dashboard-studio__module-card ${activeWidgetId === widget.id ? 'is-selected' : ''} ${
                      dropTargetWidgetId === widget.id ? 'is-drop-target' : ''
                    } ${hidden ? 'is-hidden' : ''}`}
                    draggable
                    onClick={() => handleSelectWidget(widget.id)}
                    onDragStart={() => {
                      setDraggedWidgetId(widget.id);
                    }}
                    onDragEnd={() => {
                      setDraggedWidgetId(null);
                      setDropTargetWidgetId(null);
                    }}
                    onDragEnter={() => {
                      if (!draggedWidgetId || draggedWidgetId === widget.id) {
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
                      event.preventDefault();
                      if (draggedWidgetId && draggedWidgetId !== widget.id) {
                        setDropTargetWidgetId(widget.id);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDrop(widget.id);
                    }}
                  >
                    <strong>{widget.title}</strong>
                    <small>ID: {widget.id}</small>
                    <small>Etat: {hidden ? 'Masque' : 'Visible'}</small>
                    <small>Taille: {size.toUpperCase()}</small>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="dashboard-studio__panel">
            <h3 style={{ marginTop: 0 }}>Proprietes</h3>
            {!activeWidget ? (
              <p style={{ margin: 0 }}>Selectionne un module.</p>
            ) : (
              <div className="dashboard-studio__properties">
                <p style={{ margin: 0 }}>
                  Module: <strong>{activeWidget.title}</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Technique: <code>{activeWidget.id}</code>
                </p>
                <label>
                  <span>Visible</span>
                  <select
                    value={String(activeIsVisible)}
                    onChange={(event) => {
                      void setWidgetVisibility(activeWidget.id, event.target.value === 'true');
                    }}
                  >
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                </label>
                <label>
                  <span>Taille</span>
                  <select
                    value={selectedProfile.widgetSizes[activeWidget.id] ?? 'medium'}
                    onChange={(event) => {
                      void handleWidgetSize(activeWidget.id, event.target.value as DashboardWidgetSize);
                    }}
                  >
                    <option value="small">Taille S</option>
                    <option value="medium">Taille M</option>
                    <option value="large">Taille L</option>
                  </select>
                </label>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <button className="button secondary" type="button" onClick={() => void moveSelectedWidget('up')}>
                    Monter
                  </button>
                  <button className="button secondary" type="button" onClick={() => void moveSelectedWidget('down')}>
                    Descendre
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
      ) : null}

      <div className="widgets-grid">
        {visibleWidgets.map((widget) => {
          const size = selectedProfile.widgetSizes[widget.id] ?? 'medium';
          return (
            <div
              key={widget.id}
              className={`dashboard-widget dashboard-widget--${size} ${effectiveEditing ? 'is-editing' : ''} ${
                dropTargetWidgetId === widget.id ? 'is-drop-target' : ''
              }`}
              draggable={effectiveEditing}
              onDragStart={() => {
                setDraggedWidgetId(widget.id);
              }}
              onDragEnd={() => {
                setDraggedWidgetId(null);
                setDropTargetWidgetId(null);
              }}
              onDragEnter={() => {
                if (!effectiveEditing || !draggedWidgetId || draggedWidgetId === widget.id) {
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
                if (!effectiveEditing) {
                  return;
                }
                event.preventDefault();
                if (draggedWidgetId && draggedWidgetId !== widget.id) {
                  setDropTargetWidgetId(widget.id);
                }
              }}
              onDrop={(event) => {
                if (!effectiveEditing) {
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
