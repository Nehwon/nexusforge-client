import { DragEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { canUserEditSystem, systemRepository } from '../../../data/repositories/systemRepository';
import {
  GameSystem,
  StudioComponentDefinition,
  StudioComponentType,
  StudioSchema,
  StudioViewDefinition
} from '../../../types/system';

const PALETTE_TREE: Array<{
  id: string;
  label: string;
  items: Array<{ type: StudioComponentType; label: string; defaultValue?: string | number | boolean }>;
}> = [
  {
    id: 'inputs',
    label: 'Champs',
    items: [
      { type: 'text', label: 'Texte', defaultValue: '' },
      { type: 'number', label: 'Nombre', defaultValue: 0 },
      { type: 'checkbox', label: 'Case à cocher', defaultValue: false }
    ]
  },
  {
    id: 'actions',
    label: 'Actions',
    items: [{ type: 'button', label: 'Bouton', defaultValue: '' }]
  }
];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSchema(system: GameSystem): StudioSchema {
  if (system.studioSchema?.views?.length) {
    return {
      views: system.studioSchema.views.map((view) => ({
        ...view,
        components: view.components.map((component) => ({ ...component }))
      }))
    };
  }

  return {
    views: [
      {
        id: makeId('view'),
        name: 'Vue principale',
        components: []
      }
    ]
  };
}

function createComponentFromPalette(type: StudioComponentType, label: string, defaultValue?: string | number | boolean): StudioComponentDefinition {
  return {
    id: makeId('cmp'),
    type,
    label,
    key: `${type}_${Math.random().toString(36).slice(2, 6)}`,
    defaultValue,
    reference: '',
    formula: ''
  };
}

export default function SystemStudioPage() {
  const { currentUser } = useAuth();
  const { systemId } = useParams();
  const [system, setSystem] = useState<GameSystem | null>(null);
  const [schema, setSchema] = useState<StudioSchema | null>(null);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [dragOverComponentId, setDragOverComponentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!systemId) {
        setErrorMessage('ID système manquant.');
        setIsLoading(false);
        return;
      }

      try {
        const loaded = await systemRepository.getById(systemId);
        if (!loaded) {
          throw new Error('Système introuvable.');
        }

        if (!isMounted) {
          return;
        }

        const normalized = ensureSchema(loaded);
        setSystem(loaded);
        setSchema(normalized);
        setSelectedViewId(normalized.views[0]?.id ?? '');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Chargement impossible.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [systemId]);

  const canEdit = Boolean(currentUser && system && canUserEditSystem(system, currentUser));

  const selectedView = useMemo(() => {
    if (!schema) {
      return null;
    }
    return schema.views.find((view) => view.id === selectedViewId) ?? schema.views[0] ?? null;
  }, [schema, selectedViewId]);

  const selectedComponent = useMemo(() => {
    if (!selectedView) {
      return null;
    }
    return selectedView.components.find((component) => component.id === selectedComponentId) ?? null;
  }, [selectedComponentId, selectedView]);

  const updateSchema = (update: (current: StudioSchema) => StudioSchema) => {
    setSchema((current) => {
      if (!current) {
        return current;
      }
      return update(current);
    });
  };

  const updateSelectedView = (update: (view: StudioViewDefinition) => StudioViewDefinition) => {
    if (!selectedView) {
      return;
    }

    updateSchema((current) => ({
      ...current,
      views: current.views.map((view) => (view.id === selectedView.id ? update(view) : view))
    }));
  };

  const handlePaletteDragStart = (event: DragEvent<HTMLElement>, item: { type: StudioComponentType; label: string; defaultValue?: string | number | boolean }) => {
    event.dataTransfer.setData('application/nexusforge-palette', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleComponentDragStart = (event: DragEvent<HTMLElement>, componentId: string) => {
    event.dataTransfer.setData('application/nexusforge-component-id', componentId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const reorderComponent = (sourceId: string, targetId: string) => {
    if (!selectedView || sourceId === targetId) {
      return;
    }

    const components = [...selectedView.components];
    const sourceIndex = components.findIndex((item) => item.id === sourceId);
    const targetIndex = components.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const [moved] = components.splice(sourceIndex, 1);
    components.splice(targetIndex, 0, moved);

    updateSelectedView((view) => ({
      ...view,
      components
    }));
  };

  const handleCanvasDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!canEdit || !selectedView) {
      return;
    }

    const paletteRaw = event.dataTransfer.getData('application/nexusforge-palette');
    if (paletteRaw) {
      try {
        const paletteItem = JSON.parse(paletteRaw) as { type: StudioComponentType; label: string; defaultValue?: string | number | boolean };
        const created = createComponentFromPalette(paletteItem.type, paletteItem.label, paletteItem.defaultValue);
        updateSelectedView((view) => ({
          ...view,
          components: [...view.components, created]
        }));
        setSelectedComponentId(created.id);
      } catch {
        setErrorMessage('Composant palette invalide.');
      }
      return;
    }

    const sourceComponentId = event.dataTransfer.getData('application/nexusforge-component-id');
    if (sourceComponentId && selectedView.components.some((item) => item.id === sourceComponentId)) {
      updateSelectedView((view) => {
        const components = [...view.components];
        const sourceIndex = components.findIndex((item) => item.id === sourceComponentId);
        if (sourceIndex < 0) {
          return view;
        }
        const [moved] = components.splice(sourceIndex, 1);
        components.push(moved);
        return {
          ...view,
          components
        };
      });
    }
  };

  const handleComponentDrop = (event: DragEvent<HTMLElement>, targetComponentId: string) => {
    event.preventDefault();
    setDragOverComponentId(null);
    if (!canEdit) {
      return;
    }

    const sourceComponentId = event.dataTransfer.getData('application/nexusforge-component-id');
    if (sourceComponentId) {
      reorderComponent(sourceComponentId, targetComponentId);
      return;
    }

    const paletteRaw = event.dataTransfer.getData('application/nexusforge-palette');
    if (!paletteRaw || !selectedView) {
      return;
    }

    try {
      const paletteItem = JSON.parse(paletteRaw) as { type: StudioComponentType; label: string; defaultValue?: string | number | boolean };
      const created = createComponentFromPalette(paletteItem.type, paletteItem.label, paletteItem.defaultValue);
      const components = [...selectedView.components];
      const targetIndex = components.findIndex((component) => component.id === targetComponentId);
      const insertionIndex = targetIndex >= 0 ? targetIndex : components.length;
      components.splice(insertionIndex, 0, created);

      updateSelectedView((view) => ({
        ...view,
        components
      }));
      setSelectedComponentId(created.id);
    } catch {
      setErrorMessage('Composant palette invalide.');
    }
  };

  const addView = () => {
    if (!canEdit || !schema) {
      return;
    }

    const view: StudioViewDefinition = {
      id: makeId('view'),
      name: `Vue ${schema.views.length + 1}`,
      components: []
    };

    setSchema({
      ...schema,
      views: [...schema.views, view]
    });
    setSelectedViewId(view.id);
    setSelectedComponentId('');
  };

  const removeSelectedView = () => {
    if (!canEdit || !schema || !selectedView || schema.views.length <= 1) {
      return;
    }

    const nextViews = schema.views.filter((view) => view.id !== selectedView.id);
    setSchema({ ...schema, views: nextViews });
    setSelectedViewId(nextViews[0]?.id ?? '');
    setSelectedComponentId('');
  };

  const deleteSelectedComponent = () => {
    if (!canEdit || !selectedView || !selectedComponent) {
      return;
    }

    updateSelectedView((view) => ({
      ...view,
      components: view.components.filter((item) => item.id !== selectedComponent.id)
    }));
    setSelectedComponentId('');
  };

  const updateSelectedComponent = (update: (component: StudioComponentDefinition) => StudioComponentDefinition) => {
    if (!selectedView || !selectedComponent) {
      return;
    }

    updateSelectedView((view) => ({
      ...view,
      components: view.components.map((item) => (item.id === selectedComponent.id ? update(item) : item))
    }));
  };

  const saveStudio = async () => {
    if (!currentUser || !system || !schema || !canEdit) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);

    try {
      const nextSystem: GameSystem = {
        ...system,
        studioSchema: schema
      };
      await systemRepository.upsert(nextSystem, currentUser);
      setSystem(nextSystem);
      setStatusMessage('Studio sauvegardé.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sauvegarde impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      {isLoading ? (
        <section className="card">Chargement du studio...</section>
      ) : (
        <>
          <section className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Studio de création système</h1>
                <p style={{ marginTop: 0, marginBottom: 0 }}>
                  <Link to="/systems">Retour Atelier</Link> | Système: <strong>{system?.name ?? 'N/A'}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Button type="button" onClick={() => void saveStudio()} disabled={!canEdit || isSaving}>
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>
            {!canEdit ? <p style={{ marginBottom: 0, color: '#b42318' }}>Lecture seule: seul le propriétaire ou un admin peut modifier.</p> : null}
            {statusMessage ? <p style={{ marginBottom: 0, color: '#067647' }}>{statusMessage}</p> : null}
            {errorMessage ? <p style={{ marginBottom: 0, color: '#b42318' }}>{errorMessage}</p> : null}
          </section>

          <section className="studio-layout">
            <aside className="studio-panel">
              <h2 style={{ marginTop: 0 }}>Arborescence composants</h2>
              <p style={{ marginTop: 0, fontSize: '0.9rem' }}>Glisse-dépose vers la vue centrale.</p>
              <div className="studio-tree">
                {PALETTE_TREE.map((branch) => (
                  <details key={branch.id} open>
                    <summary>{branch.label}</summary>
                    <div className="studio-palette-list">
                      {branch.items.map((item) => (
                        <button
                          key={`${branch.id}-${item.type}`}
                          type="button"
                          className="button secondary"
                          draggable={canEdit}
                          onDragStart={(event) => handlePaletteDragStart(event, item)}
                          style={{ textAlign: 'left' }}
                        >
                          {item.label} ({item.type})
                        </button>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </aside>

            <section
              className="studio-panel"
              onDragOver={(event) => {
                if (canEdit) {
                  event.preventDefault();
                }
              }}
              onDrop={handleCanvasDrop}
            >
              <h2 style={{ marginTop: 0 }}>Vue / fiche (zone centrale)</h2>
              <div className="studio-views">
                <label style={{ display: 'grid', gap: '0.35rem' }}>
                  <span>Vue active</span>
                  <select value={selectedView?.id ?? ''} onChange={(event) => setSelectedViewId(event.target.value)}>
                    {(schema?.views ?? []).map((view) => (
                      <option key={view.id} value={view.id}>
                        {view.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button type="button" variant="secondary" onClick={addView} disabled={!canEdit}>
                    + Vue
                  </Button>
                  <Button type="button" variant="secondary" onClick={removeSelectedView} disabled={!canEdit || (schema?.views.length ?? 0) <= 1}>
                    Supprimer vue
                  </Button>
                </div>
              </div>

              <div className="studio-canvas">
                {selectedView ? (
                  <>
                    <label style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      <span>Nom de la vue</span>
                      <input
                        type="text"
                        value={selectedView.name}
                        onChange={(event) =>
                          updateSelectedView((view) => ({
                            ...view,
                            name: event.target.value
                          }))
                        }
                        disabled={!canEdit}
                      />
                    </label>

                    {selectedView.components.length === 0 ? (
                      <p style={{ margin: 0 }}>Dépose un composant ici pour commencer.</p>
                    ) : (
                      <div className="studio-components-grid">
                        {selectedView.components.map((component) => (
                          <article
                            key={component.id}
                            className={`studio-component-card ${selectedComponentId === component.id ? 'is-selected' : ''} ${
                              dragOverComponentId === component.id ? 'is-drag-over' : ''
                            }`}
                            draggable={canEdit}
                            onDragStart={(event) => handleComponentDragStart(event, component.id)}
                            onDragOver={(event) => {
                              if (canEdit) {
                                event.preventDefault();
                                setDragOverComponentId(component.id);
                              }
                            }}
                            onDragLeave={() => setDragOverComponentId((current) => (current === component.id ? null : current))}
                            onDrop={(event) => handleComponentDrop(event, component.id)}
                            onClick={() => setSelectedComponentId(component.id)}
                          >
                            <strong>{component.label || '(sans label)'}</strong>
                            <span>Type: {component.type}</span>
                            <span>Clé: {component.key}</span>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0 }}>Aucune vue disponible.</p>
                )}
              </div>
            </section>

            <aside className="studio-panel">
              <h2 style={{ marginTop: 0 }}>Propriétés</h2>
              {selectedComponent ? (
                <div className="studio-properties">
                  <label>
                    <span>Label</span>
                    <input
                      type="text"
                      value={selectedComponent.label}
                      onChange={(event) =>
                        updateSelectedComponent((item) => ({
                          ...item,
                          label: event.target.value
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </label>
                  <label>
                    <span>Clé technique</span>
                    <input
                      type="text"
                      value={selectedComponent.key}
                      onChange={(event) =>
                        updateSelectedComponent((item) => ({
                          ...item,
                          key: event.target.value
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </label>
                  <label>
                    <span>Référence (@champ)</span>
                    <input
                      type="text"
                      value={selectedComponent.reference ?? ''}
                      onChange={(event) =>
                        updateSelectedComponent((item) => ({
                          ...item,
                          reference: event.target.value
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="@force"
                    />
                  </label>
                  <label>
                    <span>Formule</span>
                    <input
                      type="text"
                      value={selectedComponent.formula ?? ''}
                      onChange={(event) =>
                        updateSelectedComponent((item) => ({
                          ...item,
                          formula: event.target.value
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="@force + @agilite"
                    />
                  </label>

                  {selectedComponent.type === 'checkbox' ? (
                    <label>
                      <span>Valeur par défaut</span>
                      <select
                        value={String(Boolean(selectedComponent.defaultValue))}
                        onChange={(event) =>
                          updateSelectedComponent((item) => ({
                            ...item,
                            defaultValue: event.target.value === 'true'
                          }))
                        }
                        disabled={!canEdit}
                      >
                        <option value="false">False</option>
                        <option value="true">True</option>
                      </select>
                    </label>
                  ) : null}

                  {selectedComponent.type === 'number' ? (
                    <label>
                      <span>Valeur par défaut</span>
                      <input
                        type="number"
                        value={typeof selectedComponent.defaultValue === 'number' ? selectedComponent.defaultValue : 0}
                        onChange={(event) =>
                          updateSelectedComponent((item) => ({
                            ...item,
                            defaultValue: Number(event.target.value)
                          }))
                        }
                        disabled={!canEdit}
                      />
                    </label>
                  ) : null}

                  {(selectedComponent.type === 'text' || selectedComponent.type === 'button') ? (
                    <label>
                      <span>Valeur par défaut</span>
                      <input
                        type="text"
                        value={typeof selectedComponent.defaultValue === 'string' ? selectedComponent.defaultValue : ''}
                        onChange={(event) =>
                          updateSelectedComponent((item) => ({
                            ...item,
                            defaultValue: event.target.value
                          }))
                        }
                        disabled={!canEdit}
                      />
                    </label>
                  ) : null}

                  <Button type="button" variant="secondary" onClick={deleteSelectedComponent} disabled={!canEdit}>
                    Supprimer ce composant
                  </Button>

                  <p style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                    Astuce: utilise <code>@nomChamp</code> dans les références et formules pour relier les champs entre eux.
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0 }}>Sélectionne un composant dans la vue centrale.</p>
              )}
            </aside>
          </section>
        </>
      )}
    </Layout>
  );
}
