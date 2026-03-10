import { DragEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
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

type PaletteItem = { type: StudioComponentType; label: string; defaultValue?: string | number | boolean; options?: string[] };
const STUDIO_LEFT_WIDTH_KEY = 'nexusforge.studio.leftWidth';
const STUDIO_RIGHT_WIDTH_KEY = 'nexusforge.studio.rightWidth';
const STUDIO_FULLSCREEN_KEY = 'nexusforge.studio.fullscreen';

const PALETTE_TREE: Array<{ id: string; label: string; items: PaletteItem[] }> = [
  {
    id: 'basic-inputs',
    label: 'Champs de base',
    items: [
      { type: 'text', label: 'Texte', defaultValue: '' },
      { type: 'textarea', label: 'Texte multi-ligne', defaultValue: '' },
      { type: 'number', label: 'Nombre', defaultValue: 0 },
      { type: 'checkbox', label: 'Case à cocher', defaultValue: false },
      { type: 'choice', label: 'Choix (liste)', options: ['Option A', 'Option B'] },
      { type: 'range', label: 'Jauge (range)', defaultValue: 0 }
    ]
  },
  {
    id: 'advanced-inputs',
    label: 'Champs avancés',
    items: [
      { type: 'color', label: 'Couleur', defaultValue: '#ffffff' },
      { type: 'date', label: 'Date' },
      { type: 'time', label: 'Heure' },
      { type: 'avatar', label: 'Avatar / image' }
    ]
  },
  {
    id: 'display-actions',
    label: 'Affichage / actions',
    items: [
      { type: 'label', label: 'Label / texte statique', defaultValue: 'Titre de section' },
      { type: 'icon', label: 'Icone' },
      { type: 'button', label: 'Bouton', defaultValue: 'Action' }
    ]
  },
  {
    id: 'layout',
    label: 'Layout / structure',
    items: [
      { type: 'container', label: 'Container / groupe' },
      { type: 'row', label: 'Ligne' },
      { type: 'column', label: 'Colonne' },
      { type: 'tabs', label: 'Onglets', options: ['Vue 1', 'Vue 2'] },
      { type: 'tabs_nested', label: 'Onglets imbriques', options: ['Bloc A', 'Bloc B'] },
      { type: 'view', label: 'Bloc vue' },
      { type: 'repeater', label: 'Liste repetable', options: ['Ligne 1'] }
    ]
  },
  {
    id: 'rpg-specialized',
    label: 'Composants JDR',
    items: [
      { type: 'dice_roll', label: 'Jet de des', defaultValue: '1d20+@mod' },
      { type: 'table', label: 'Tableau', options: ['Nom', 'Valeur'] },
      { type: 'inventory', label: 'Inventaire', options: ['Nom', 'Quantite', 'Poids'] },
      { type: 'relation', label: 'Reference relationnelle' }
    ]
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
    views: [{ id: makeId('view'), name: 'Vue principale', components: [] }]
  };
}

function createComponentFromPalette(item: PaletteItem): StudioComponentDefinition {
  return {
    id: makeId('cmp'),
    type: item.type,
    label: item.label,
    key: `${item.type}_${Math.random().toString(36).slice(2, 6)}`,
    defaultValue: item.defaultValue,
    placeholder: '',
    options: item.options,
    min: item.type === 'range' ? 0 : undefined,
    max: item.type === 'range' ? 100 : undefined,
    step: item.type === 'range' ? 1 : undefined,
    required: false,
    columns: item.type === 'table' || item.type === 'inventory' ? item.options ?? ['Nom', 'Valeur'] : undefined,
    diceFormula: item.type === 'dice_roll' ? String(item.defaultValue ?? '1d20') : undefined,
    relationTarget: item.type === 'relation' ? '' : undefined,
    allowMultiple: item.type === 'relation' ? false : undefined,
    reference: '',
    formula: ''
  };
}

function renderComponentPreview(component: StudioComponentDefinition): JSX.Element {
  if (component.type === 'checkbox') {
    return <label><input type="checkbox" disabled checked={Boolean(component.defaultValue)} /> {component.label}</label>;
  }
  if (component.type === 'choice') {
    return (
      <select disabled defaultValue="">
        <option value="">{component.placeholder || 'Choisir'}</option>
        {(component.options ?? []).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }
  if (component.type === 'textarea') {
    return <textarea disabled rows={2} placeholder={component.placeholder || component.label} />;
  }
  if (component.type === 'range') {
    return <input type="range" disabled min={component.min ?? 0} max={component.max ?? 100} step={component.step ?? 1} value={typeof component.defaultValue === 'number' ? component.defaultValue : 0} />;
  }
  if (component.type === 'dice_roll') {
    return <code>{component.diceFormula || component.formula || '1d20'}</code>;
  }
  if (component.type === 'table' || component.type === 'inventory') {
    const headers = component.columns ?? ['Col A', 'Col B'];
    return (
      <div style={{ display: 'grid', gap: '0.2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))`, gap: '0.25rem', fontSize: '0.75rem' }}>
          {headers.map((header) => <strong key={header}>{header}</strong>)}
        </div>
      </div>
    );
  }
  if (component.type === 'relation') {
    return <code>ref: {component.relationTarget || 'target'}</code>;
  }
  if (component.type === 'button') {
    return <button className="button secondary" type="button" disabled>{String(component.defaultValue || component.label || 'Action')}</button>;
  }
  return <input type={component.type === 'number' ? 'number' : 'text'} disabled placeholder={component.placeholder || component.label} />;
}

export default function SystemStudioPage() {
  const { currentUser } = useAuth();
  const { systemId } = useParams();
  const studioLayoutRef = useRef<HTMLElement | null>(null);

  const [system, setSystem] = useState<GameSystem | null>(null);
  const [schema, setSchema] = useState<StudioSchema | null>(null);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [dragOverComponentId, setDragOverComponentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(290);
  const [rightPanelWidth, setRightPanelWidth] = useState(330);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!systemId) {
        setErrorMessage('ID systeme manquant.');
        setIsLoading(false);
        return;
      }
      try {
        const loaded = await systemRepository.getById(systemId);
        if (!loaded) {
          throw new Error('Systeme introuvable.');
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

  useEffect(() => {
    const storedLeft = Number(localStorage.getItem(STUDIO_LEFT_WIDTH_KEY) ?? 290);
    const storedRight = Number(localStorage.getItem(STUDIO_RIGHT_WIDTH_KEY) ?? 330);
    const storedFullscreen = localStorage.getItem(STUDIO_FULLSCREEN_KEY);
    if (Number.isFinite(storedLeft) && storedLeft >= 220 && storedLeft <= 520) {
      setLeftPanelWidth(storedLeft);
    }
    if (Number.isFinite(storedRight) && storedRight >= 220 && storedRight <= 520) {
      setRightPanelWidth(storedRight);
    }
    if (storedFullscreen === 'true') {
      setIsFullscreen(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STUDIO_LEFT_WIDTH_KEY, String(leftPanelWidth));
  }, [leftPanelWidth]);

  useEffect(() => {
    localStorage.setItem(STUDIO_RIGHT_WIDTH_KEY, String(rightPanelWidth));
  }, [rightPanelWidth]);

  useEffect(() => {
    localStorage.setItem(STUDIO_FULLSCREEN_KEY, isFullscreen ? 'true' : 'false');
  }, [isFullscreen]);

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
    setSchema((current) => (current ? update(current) : current));
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

  const updateSelectedComponent = (update: (component: StudioComponentDefinition) => StudioComponentDefinition) => {
    if (!selectedView || !selectedComponent) {
      return;
    }
    updateSelectedView((view) => ({
      ...view,
      components: view.components.map((item) => (item.id === selectedComponent.id ? update(item) : item))
    }));
  };

  const startResizing = (side: 'left' | 'right', event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startLeft = leftPanelWidth;
    const startRight = rightPanelWidth;

    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const containerWidth = studioLayoutRef.current?.clientWidth ?? window.innerWidth;
      const minPanel = 220;
      const maxLeft = Math.max(minPanel, containerWidth - rightPanelWidth - 460);
      const maxRight = Math.max(minPanel, containerWidth - leftPanelWidth - 460);

      if (side === 'left') {
        setLeftPanelWidth(Math.min(Math.max(minPanel, startLeft + deltaX), maxLeft));
      } else {
        setRightPanelWidth(Math.min(Math.max(minPanel, startRight - deltaX), maxRight));
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handlePaletteDragStart = (event: DragEvent<HTMLElement>, item: PaletteItem) => {
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
    updateSelectedView((view) => ({ ...view, components }));
  };

  const handleCanvasDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!canEdit || !selectedView) {
      return;
    }

    const paletteRaw = event.dataTransfer.getData('application/nexusforge-palette');
    if (paletteRaw) {
      try {
        const item = JSON.parse(paletteRaw) as PaletteItem;
        const created = createComponentFromPalette(item);
        updateSelectedView((view) => ({ ...view, components: [...view.components, created] }));
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
        return { ...view, components };
      });
    }
  };

  const handleComponentDrop = (event: DragEvent<HTMLElement>, targetComponentId: string) => {
    event.preventDefault();
    setDragOverComponentId(null);
    if (!canEdit || !selectedView) {
      return;
    }

    const sourceComponentId = event.dataTransfer.getData('application/nexusforge-component-id');
    if (sourceComponentId) {
      reorderComponent(sourceComponentId, targetComponentId);
      return;
    }

    const paletteRaw = event.dataTransfer.getData('application/nexusforge-palette');
    if (!paletteRaw) {
      return;
    }

    try {
      const item = JSON.parse(paletteRaw) as PaletteItem;
      const created = createComponentFromPalette(item);
      const components = [...selectedView.components];
      const targetIndex = components.findIndex((component) => component.id === targetComponentId);
      const insertionIndex = targetIndex >= 0 ? targetIndex : components.length;
      components.splice(insertionIndex, 0, created);
      updateSelectedView((view) => ({ ...view, components }));
      setSelectedComponentId(created.id);
    } catch {
      setErrorMessage('Composant palette invalide.');
    }
  };

  const addView = () => {
    if (!canEdit || !schema) {
      return;
    }
    const view: StudioViewDefinition = { id: makeId('view'), name: `Vue ${schema.views.length + 1}`, components: [] };
    setSchema({ ...schema, views: [...schema.views, view] });
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
    updateSelectedView((view) => ({ ...view, components: view.components.filter((item) => item.id !== selectedComponent.id) }));
    setSelectedComponentId('');
  };

  const saveStudio = async () => {
    if (!currentUser || !system || !schema || !canEdit) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSaving(true);
    try {
      const nextSystem: GameSystem = { ...system, studioSchema: schema };
      await systemRepository.upsert(nextSystem, currentUser);
      setSystem(nextSystem);
      setStatusMessage('Studio sauvegarde.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sauvegarde impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveStudio();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const layoutStyle = typeof window !== 'undefined' && window.innerWidth > 900
    ? { gridTemplateColumns: `${leftPanelWidth}px 8px minmax(420px, 1fr) 8px ${rightPanelWidth}px` }
    : undefined;

  return (
    <Layout wide>
      {isLoading ? (
        <section className="card">Chargement du studio...</section>
      ) : (
        <>
          <section className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Studio de creation systeme</h1>
                <p style={{ marginTop: 0, marginBottom: 0 }}>
                  <Link to="/systems">Retour Atelier</Link> | Systeme: <strong>{system?.name ?? 'N/A'}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Button type="button" variant="secondary" onClick={() => setIsFullscreen((current) => !current)}>
                  {isFullscreen ? 'Quitter plein ecran studio' : 'Plein ecran studio'}
                </Button>
                <Button type="button" onClick={() => void saveStudio()} disabled={!canEdit || isSaving}>
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>
            {!canEdit ? <p style={{ marginBottom: 0, color: '#b42318' }}>Lecture seule: proprietaire/admin uniquement.</p> : null}
            {statusMessage ? <p style={{ marginBottom: 0, color: '#067647' }}>{statusMessage}</p> : null}
            {errorMessage ? <p style={{ marginBottom: 0, color: '#b42318' }}>{errorMessage}</p> : null}
          </section>

          <section className={isFullscreen ? 'studio-fullscreen' : ''}>
            <section ref={studioLayoutRef} className="studio-layout" style={layoutStyle}>
              <aside className="studio-panel">
                <h2 style={{ marginTop: 0 }}>Arborescence composants</h2>
                <p style={{ marginTop: 0, fontSize: '0.9rem' }}>Glisse-depose vers la vue centrale.</p>
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

              <div className="studio-splitter" onMouseDown={(event) => startResizing('left', event)} title="Redimensionner" />

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
                          onChange={(event) => updateSelectedView((view) => ({ ...view, name: event.target.value }))}
                          disabled={!canEdit}
                        />
                      </label>

                      {selectedView.components.length === 0 ? (
                        <p style={{ margin: 0 }}>Depose un composant ici pour commencer.</p>
                      ) : (
                        <div className="studio-components-grid">
                          {selectedView.components.map((component) => (
                            <article
                              key={component.id}
                              className={`studio-component-card ${selectedComponentId === component.id ? 'is-selected' : ''} ${dragOverComponentId === component.id ? 'is-drag-over' : ''}`}
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
                              <span>Cle: {component.key}</span>
                              <div style={{ marginTop: '0.25rem' }}>{renderComponentPreview(component)}</div>
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

              <div className="studio-splitter" onMouseDown={(event) => startResizing('right', event)} title="Redimensionner" />

              <aside className="studio-panel">
                <h2 style={{ marginTop: 0 }}>Proprietes</h2>
                {selectedComponent ? (
                  <div className="studio-properties">
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Type: <strong>{selectedComponent.type}</strong></p>
                    <label>
                      <span>Label</span>
                      <input type="text" value={selectedComponent.label} onChange={(event) => updateSelectedComponent((item) => ({ ...item, label: event.target.value }))} disabled={!canEdit} />
                    </label>
                    <label>
                      <span>Cle technique</span>
                      <input type="text" value={selectedComponent.key} onChange={(event) => updateSelectedComponent((item) => ({ ...item, key: event.target.value }))} disabled={!canEdit} />
                    </label>
                    <label>
                      <span>Placeholder</span>
                      <input type="text" value={selectedComponent.placeholder ?? ''} onChange={(event) => updateSelectedComponent((item) => ({ ...item, placeholder: event.target.value }))} disabled={!canEdit} />
                    </label>
                    <label>
                      <span>Reference (@champ)</span>
                      <input type="text" value={selectedComponent.reference ?? ''} onChange={(event) => updateSelectedComponent((item) => ({ ...item, reference: event.target.value }))} disabled={!canEdit} placeholder="@force" />
                    </label>
                    <label>
                      <span>Formule</span>
                      <input type="text" value={selectedComponent.formula ?? ''} onChange={(event) => updateSelectedComponent((item) => ({ ...item, formula: event.target.value }))} disabled={!canEdit} placeholder="@force + @agilite" />
                    </label>

                    {(selectedComponent.type === 'choice' || selectedComponent.type === 'tabs' || selectedComponent.type === 'repeater' || selectedComponent.type === 'tabs_nested') ? (
                      <label>
                        <span>Options (une par ligne)</span>
                        <textarea
                          rows={4}
                          value={(selectedComponent.options ?? []).join('\n')}
                          onChange={(event) => updateSelectedComponent((item) => ({ ...item, options: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) }))}
                          disabled={!canEdit}
                        />
                      </label>
                    ) : null}

                    {(selectedComponent.type === 'table' || selectedComponent.type === 'inventory') ? (
                      <label>
                        <span>Colonnes (une par ligne)</span>
                        <textarea
                          rows={4}
                          value={(selectedComponent.columns ?? []).join('\n')}
                          onChange={(event) => updateSelectedComponent((item) => ({ ...item, columns: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) }))}
                          disabled={!canEdit}
                        />
                      </label>
                    ) : null}

                    {selectedComponent.type === 'dice_roll' ? (
                      <label>
                        <span>Formule de des</span>
                        <input
                          type="text"
                          value={selectedComponent.diceFormula ?? ''}
                          onChange={(event) => updateSelectedComponent((item) => ({ ...item, diceFormula: event.target.value }))}
                          disabled={!canEdit}
                          placeholder="1d20+@mod"
                        />
                      </label>
                    ) : null}

                    {selectedComponent.type === 'relation' ? (
                      <>
                        <label>
                          <span>Cible relationnelle</span>
                          <input
                            type="text"
                            value={selectedComponent.relationTarget ?? ''}
                            onChange={(event) => updateSelectedComponent((item) => ({ ...item, relationTarget: event.target.value }))}
                            disabled={!canEdit}
                            placeholder="character|item|npc"
                          />
                        </label>
                        <label>
                          <span>Liens multiples</span>
                          <select
                            value={String(Boolean(selectedComponent.allowMultiple))}
                            onChange={(event) => updateSelectedComponent((item) => ({ ...item, allowMultiple: event.target.value === 'true' }))}
                            disabled={!canEdit}
                          >
                            <option value="false">Non</option>
                            <option value="true">Oui</option>
                          </select>
                        </label>
                      </>
                    ) : null}

                    {(selectedComponent.type === 'number' || selectedComponent.type === 'range') ? (
                      <>
                        <label>
                          <span>Min</span>
                          <input type="number" value={selectedComponent.min ?? 0} onChange={(event) => updateSelectedComponent((item) => ({ ...item, min: Number(event.target.value) }))} disabled={!canEdit} />
                        </label>
                        <label>
                          <span>Max</span>
                          <input type="number" value={selectedComponent.max ?? 100} onChange={(event) => updateSelectedComponent((item) => ({ ...item, max: Number(event.target.value) }))} disabled={!canEdit} />
                        </label>
                        <label>
                          <span>Step</span>
                          <input type="number" value={selectedComponent.step ?? 1} onChange={(event) => updateSelectedComponent((item) => ({ ...item, step: Number(event.target.value) }))} disabled={!canEdit} />
                        </label>
                      </>
                    ) : null}

                    {selectedComponent.type === 'checkbox' ? (
                      <label>
                        <span>Valeur par defaut</span>
                        <select value={String(Boolean(selectedComponent.defaultValue))} onChange={(event) => updateSelectedComponent((item) => ({ ...item, defaultValue: event.target.value === 'true' }))} disabled={!canEdit}>
                          <option value="false">False</option>
                          <option value="true">True</option>
                        </select>
                      </label>
                    ) : null}

                    {selectedComponent.type !== 'checkbox' ? (
                      <label>
                        <span>Valeur par defaut</span>
                        <input
                          type={selectedComponent.type === 'number' || selectedComponent.type === 'range' ? 'number' : 'text'}
                          value={typeof selectedComponent.defaultValue === 'number' ? selectedComponent.defaultValue : typeof selectedComponent.defaultValue === 'string' ? selectedComponent.defaultValue : ''}
                          onChange={(event) => updateSelectedComponent((item) => ({
                            ...item,
                            defaultValue: selectedComponent.type === 'number' || selectedComponent.type === 'range' ? Number(event.target.value) : event.target.value
                          }))}
                          disabled={!canEdit}
                        />
                      </label>
                    ) : null}

                    <label>
                      <span>Obligatoire</span>
                      <select value={String(Boolean(selectedComponent.required))} onChange={(event) => updateSelectedComponent((item) => ({ ...item, required: event.target.value === 'true' }))} disabled={!canEdit}>
                        <option value="false">Non</option>
                        <option value="true">Oui</option>
                      </select>
                    </label>

                    <Button type="button" variant="secondary" onClick={deleteSelectedComponent} disabled={!canEdit}>
                      Supprimer ce composant
                    </Button>

                    <p style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                      Astuce: utilise <code>@nomChamp</code> dans references/formules pour lier les champs.
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>Selectionne un composant dans la vue centrale.</p>
                )}
              </aside>
            </section>
          </section>
        </>
      )}
    </Layout>
  );
}
