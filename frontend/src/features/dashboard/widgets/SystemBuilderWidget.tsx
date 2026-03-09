import { useEffect, useMemo, useState } from 'react';
import { characterRepository, systemRepository } from '../../../data/repositories';
import { applyRulesProgramToSheet } from '../../../services/systemRulesEngine';
import { Character } from '../../../types/character';
import { CharacterSheetView, SheetField, SheetGroup } from '../../../types/characterSheet';
import { Session } from '../../../types/session';
import { DefineRollBlock, GameSystem, RulesProgramBlock, SetSecondaryStatBlock } from '../../../types/system';
import { User } from '../../../types/user';
import { canUserEditSystem } from '../../../data/repositories/systemRepository';

type SystemBuilderWidgetProps = {
  currentUser: User;
  currentSession: Session;
  role: 'gm' | 'player';
};

type NumericFieldOption = {
  id: string;
  label: string;
};

function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now()}-${random}`;
}

function reorderBlocks(blocks: RulesProgramBlock[], sourceId: string, targetId: string): RulesProgramBlock[] {
  if (sourceId === targetId) {
    return blocks;
  }

  const next = [...blocks];
  const sourceIndex = next.findIndex((block) => block.id === sourceId);
  const targetIndex = next.findIndex((block) => block.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return blocks;
  }

  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) {
    return blocks;
  }

  next.splice(targetIndex, 0, moved);
  return next;
}

function reorderFields(fields: SheetField[], sourceId: string, targetId: string): SheetField[] {
  if (sourceId === targetId) {
    return fields;
  }

  const next = [...fields];
  const sourceIndex = next.findIndex((field) => field.id === sourceId);
  const targetIndex = next.findIndex((field) => field.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return fields;
  }

  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) {
    return fields;
  }

  next.splice(targetIndex, 0, moved);
  return next;
}

function moveFieldToGroup(fields: SheetField[], sourceId: string, targetGroupId: string): SheetField[] {
  const sourceIndex = fields.findIndex((field) => field.id === sourceId);
  if (sourceIndex === -1) {
    return fields;
  }

  const next = [...fields];
  const [moved] = next.splice(sourceIndex, 1);
  if (!moved) {
    return fields;
  }

  const movedWithGroup: SheetField = { ...moved, groupId: targetGroupId };
  const lastIndexInGroup = next.reduce((lastIndex, field, index) => (field.groupId === targetGroupId ? index : lastIndex), -1);
  if (lastIndexInGroup === -1) {
    next.push(movedWithGroup);
  } else {
    next.splice(lastIndexInGroup + 1, 0, movedWithGroup);
  }

  return next;
}

function buildDefaultSystem(systemId: string): GameSystem {
  const now = new Date().toISOString();
  return {
    id: systemId,
    name: `Systeme ${systemId}`,
    version: '0.1.0',
    author: 'Nexus Forge',
    ownerUserId: 'unknown-owner',
    visibility: 'private',
    tags: ['custom'],
    rulesProgram: [],
    referenceSheets: [],
    createdAt: now,
    updatedAt: now
  };
}

function createDefaultSecondaryBlock(firstFieldId: string | null): SetSecondaryStatBlock {
  return {
    id: makeId('blk-stat'),
    type: 'set_secondary_stat',
    label: 'Nouvelle stat secondaire',
    targetFieldId: firstFieldId ?? 'new_secondary_stat',
    sourceFieldIds: firstFieldId ? [firstFieldId] : [],
    operation: 'sum',
    constantModifier: 0,
    rounding: 'round'
  };
}

function createDefaultRollBlock(firstFieldId: string | null): DefineRollBlock {
  return {
    id: makeId('blk-roll'),
    type: 'define_roll',
    actionId: makeId('action'),
    label: 'Nouveau jet',
    description: '',
    diceCount: 1,
    diceSides: 20,
    modifierFieldId: firstFieldId ?? undefined,
    flatModifier: 0
  };
}

function mapNumericFieldOptions(characters: Character[]): NumericFieldOption[] {
  const optionsById = new Map<string, NumericFieldOption>();

  for (const character of characters) {
    for (const field of character.sheet?.fields ?? []) {
      if (field.type !== 'number' && field.type !== 'resource') {
        continue;
      }

      if (!optionsById.has(field.id)) {
        optionsById.set(field.id, {
          id: field.id,
          label: `${field.label} (${field.id})`
        });
      }
    }
  }

  return [...optionsById.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function mapNumericFieldOptionsFromSystem(system: GameSystem | null): NumericFieldOption[] {
  if (!system?.referenceSheets) {
    return [];
  }

  const optionsById = new Map<string, NumericFieldOption>();
  for (const sheet of system.referenceSheets) {
    for (const field of sheet.fields) {
      if (field.type !== 'number' && field.type !== 'resource') {
        continue;
      }

      if (!optionsById.has(field.id)) {
        optionsById.set(field.id, {
          id: field.id,
          label: `${field.label} (${field.id})`
        });
      }
    }
  }

  return [...optionsById.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function buildDefaultReferenceSheet(): CharacterSheetView {
  const id = makeId('template');
  return {
    id,
    name: 'Nouveau template',
    groups: [{ id: 'core', label: 'Core', layout: 'grid' }],
    fields: [{ id: 'stat-1', label: 'Stat 1', type: 'number', value: 0, groupId: 'core', isPrimary: true }],
    actions: []
  };
}

function buildDefaultGroup(): SheetGroup {
  return {
    id: makeId('group'),
    label: 'Nouveau groupe',
    layout: 'grid'
  };
}

function cloneReferenceSheet(source: CharacterSheetView): CharacterSheetView {
  return {
    ...source,
    id: makeId('template'),
    name: `${source.name} (copie)`,
    groups: source.groups.map((group) => ({ ...group })),
    fields: source.fields.map((field) => ({ ...field })),
    actions: source.actions?.map((action) => ({ ...action }))
  };
}

function renderPreviewField(field: SheetField) {
  if (field.type === 'resource') {
    const value = typeof field.value === 'number' ? field.value : Number(field.value) || 0;
    const max = field.max ?? value;
    const percentage = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

    return (
      <article key={field.id} className="character-resource">
        <div className="character-resource__meta">
          <strong>{field.label}</strong>
          <span>
            {value}/{max}
          </span>
        </div>
        <div className="character-resource__bar">
          <span style={{ width: `${percentage}%` }} />
        </div>
      </article>
    );
  }

  if (field.type === 'number') {
    return (
      <article key={field.id} className="character-number-badge">
        <span>{field.label}</span>
        <strong>{field.value}</strong>
      </article>
    );
  }

  if (field.type === 'tag') {
    return (
      <article key={field.id} className="character-chip">
        <span>{field.label}</span>
        {field.value !== field.label ? <strong>{field.value}</strong> : null}
      </article>
    );
  }

  return (
    <article key={field.id} className="character-text">
      <strong>{field.label}</strong>
      <p>{field.value}</p>
    </article>
  );
}

export default function SystemBuilderWidget({ currentUser, currentSession, role }: SystemBuilderWidgetProps) {
  const [system, setSystem] = useState<GameSystem | null>(null);
  const [draftProgram, setDraftProgram] = useState<RulesProgramBlock[]>([]);
  const [draftReferenceSheets, setDraftReferenceSheets] = useState<CharacterSheetView[]>([]);
  const [selectedReferenceSheetId, setSelectedReferenceSheetId] = useState<string | null>(null);
  const [referenceSheetNameDraft, setReferenceSheetNameDraft] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTargetBlockId, setDropTargetBlockId] = useState<string | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dropTargetFieldId, setDropTargetFieldId] = useState<string | null>(null);
  const [selectedFieldGroupId, setSelectedFieldGroupId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSystemAndFields() {
      try {
        const [localSystem, localCharacters] = await Promise.all([
          systemRepository.getByIdForUser(currentSession.systemId, currentUser),
          characterRepository.listForSession({
            sessionId: currentSession.id,
            role: 'gm',
            currentUserId: currentUser.id
          })
        ]);

        if (!isMounted) {
          return;
        }

        const nextSystem = localSystem ?? buildDefaultSystem(currentSession.systemId);
        setSystem(nextSystem);
        setDraftProgram(nextSystem.rulesProgram ?? []);
        const nextReferenceSheets = nextSystem.referenceSheets ?? [];
        setDraftReferenceSheets(nextReferenceSheets);
        setSelectedReferenceSheetId((current) => current ?? nextReferenceSheets[0]?.id ?? null);
        setCharacters(localCharacters);
        setCanEdit(canUserEditSystem(nextSystem, currentUser));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger le systeme de jeu.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSystemAndFields();

    return () => {
      isMounted = false;
    };
  }, [currentSession.id, currentSession.systemId, currentUser.id]);

  const numericFieldOptions = useMemo(() => {
    const fromCharacters = mapNumericFieldOptions(characters);
    if (fromCharacters.length > 0) {
      return fromCharacters;
    }
    return mapNumericFieldOptionsFromSystem(system);
  }, [characters, system]);
  const firstFieldId = numericFieldOptions[0]?.id ?? null;
  const selectedReferenceSheet =
    draftReferenceSheets.find((sheet) => sheet.id === selectedReferenceSheetId) ?? draftReferenceSheets[0] ?? null;
  const previewSheet = useMemo(() => {
    if (!selectedReferenceSheet || !system) {
      return null;
    }

    return applyRulesProgramToSheet(selectedReferenceSheet, {
      ...system,
      rulesProgram: draftProgram
    });
  }, [selectedReferenceSheet, system, draftProgram]);

  useEffect(() => {
    setReferenceSheetNameDraft(selectedReferenceSheet?.name ?? '');
    setSelectedFieldGroupId((current) => current ?? selectedReferenceSheet?.groups[0]?.id ?? null);
  }, [selectedReferenceSheet?.id, selectedReferenceSheet?.name]);

  const updateBlock = (blockId: string, update: (block: RulesProgramBlock) => RulesProgramBlock) => {
    setDraftProgram((previous) => previous.map((block) => (block.id === blockId ? update(block) : block)));
  };

  const updateSelectedReferenceSheet = (update: (sheet: CharacterSheetView) => CharacterSheetView) => {
    if (!selectedReferenceSheet) {
      return;
    }

    setDraftReferenceSheets((previous) => previous.map((sheet) => (sheet.id === selectedReferenceSheet.id ? update(sheet) : sheet)));
  };

  const addFieldToSelectedReferenceSheet = (type: SheetField['type']) => {
    if (!selectedReferenceSheet) {
      return;
    }

    const groupId = selectedFieldGroupId ?? selectedReferenceSheet.groups[0]?.id ?? 'core';
    const fieldId = makeId('field');
    const label = type === 'resource' ? 'Ressource' : type === 'text' ? 'Texte' : type === 'tag' ? 'Tag' : 'Nombre';

    const field: SheetField = {
      id: fieldId,
      label: `${label} ${selectedReferenceSheet.fields.length + 1}`,
      type,
      value: type === 'text' || type === 'tag' ? '' : 0,
      groupId,
      ...(type === 'resource' ? { max: 10 } : {})
    };

    updateSelectedReferenceSheet((sheet) => ({
      ...sheet,
      fields: [...sheet.fields, field]
    }));
  };

  const addBlock = (type: 'set_secondary_stat' | 'define_roll') => {
    if (type === 'set_secondary_stat') {
      setDraftProgram((previous) => [...previous, createDefaultSecondaryBlock(firstFieldId)]);
      return;
    }

    setDraftProgram((previous) => [...previous, createDefaultRollBlock(firstFieldId)]);
  };

  const handleSave = async () => {
    if (!system) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const nextSystem: GameSystem = {
        ...system,
        rulesProgram: draftProgram,
        referenceSheets: draftReferenceSheets,
        updatedAt: new Date().toISOString()
      };

      await systemRepository.upsert(nextSystem, currentUser);
      setSystem(nextSystem);
      setStatusMessage('Systeme sauvegarde. Les fiches utilisent maintenant ces regles.');
      window.dispatchEvent(new CustomEvent('system-updated', { detail: { systemId: nextSystem.id } }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur pendant la sauvegarde du systeme.');
    } finally {
      setIsSaving(false);
    }
  };

  if (role !== 'gm') {
    return <p style={{ margin: 0 }}>Edition du systeme reservee au MJ.</p>;
  }

  if (isLoading) {
    return <p style={{ margin: 0 }}>Chargement de l editeur de systeme...</p>;
  }

  if (errorMessage) {
    return <p style={{ margin: 0, color: '#b42318' }}>{errorMessage}</p>;
  }

  if (!system) {
    return <p style={{ margin: 0 }}>Systeme introuvable.</p>;
  }

  return (
    <div className="system-builder">
      <p style={{ marginTop: 0 }}>
        Mode visuel type Scratch: ajoute des blocs, glisse-depose pour reordonner, puis sauvegarde.
      </p>
      {!canEdit ? (
        <p style={{ margin: 0, color: '#b42318' }}>
          Lecture seule: seul le proprietaire du systeme ou un admin peut le modifier.
        </p>
      ) : null}

      <fieldset className="system-builder__fieldset" disabled={!canEdit}>
        <section className="system-builder__reference">
          <header className="system-builder__reference-header">
            <strong>Templates de fiche de reference</strong>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button className="button secondary" type="button" onClick={() => setIsPreviewOpen((value) => !value)}>
                {isPreviewOpen ? 'Masquer preview' : 'Afficher preview'}
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  const created = buildDefaultReferenceSheet();
                  setDraftReferenceSheets((previous) => [...previous, created]);
                  setSelectedReferenceSheetId(created.id);
                }}
              >
                + Template
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  if (!selectedReferenceSheet) {
                    return;
                  }
                  const duplicated = cloneReferenceSheet(selectedReferenceSheet);
                  setDraftReferenceSheets((previous) => [...previous, duplicated]);
                  setSelectedReferenceSheetId(duplicated.id);
                }}
                disabled={!selectedReferenceSheet}
              >
                Dupliquer template
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  if (!selectedReferenceSheet || draftReferenceSheets.length <= 1) {
                    return;
                  }
                  const next = draftReferenceSheets.filter((sheet) => sheet.id !== selectedReferenceSheet.id);
                  setDraftReferenceSheets(next);
                  setSelectedReferenceSheetId(next[0]?.id ?? null);
                }}
                disabled={!selectedReferenceSheet || draftReferenceSheets.length <= 1}
              >
                Supprimer template
              </button>
            </div>
          </header>

          {draftReferenceSheets.length > 0 ? (
            <div className="system-builder__reference-content">
              <label style={{ display: 'grid', gap: '0.3rem' }}>
                <span>Template actif</span>
                <select
                  value={selectedReferenceSheet?.id ?? ''}
                  onChange={(event) => setSelectedReferenceSheetId(event.target.value)}
                >
                  {draftReferenceSheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedReferenceSheet ? (
                <>
                  <label style={{ display: 'grid', gap: '0.3rem' }}>
                    <span>Nom du template</span>
                    <input
                      type="text"
                      value={referenceSheetNameDraft}
                      onChange={(event) => setReferenceSheetNameDraft(event.target.value)}
                      onBlur={() => {
                        const trimmed = referenceSheetNameDraft.trim();
                        if (!trimmed) {
                          setReferenceSheetNameDraft(selectedReferenceSheet.name);
                          return;
                        }
                        updateSelectedReferenceSheet((sheet) => ({ ...sheet, name: trimmed }));
                      }}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <select
                      value={selectedFieldGroupId ?? ''}
                      onChange={(event) => setSelectedFieldGroupId(event.target.value)}
                      style={{ minWidth: 180 }}
                    >
                      {selectedReferenceSheet.groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          Groupe: {group.label}
                        </option>
                      ))}
                    </select>
                    <button className="button secondary" type="button" onClick={() => addFieldToSelectedReferenceSheet('number')}>
                      + Champ nombre
                    </button>
                    <button className="button secondary" type="button" onClick={() => addFieldToSelectedReferenceSheet('resource')}>
                      + Champ ressource
                    </button>
                    <button className="button secondary" type="button" onClick={() => addFieldToSelectedReferenceSheet('text')}>
                      + Champ texte
                    </button>
                    <button className="button secondary" type="button" onClick={() => addFieldToSelectedReferenceSheet('tag')}>
                      + Champ tag
                    </button>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => {
                        const nextGroup = buildDefaultGroup();
                        updateSelectedReferenceSheet((sheet) => ({
                          ...sheet,
                          groups: [...sheet.groups, nextGroup]
                        }));
                        setSelectedFieldGroupId(nextGroup.id);
                      }}
                    >
                      + Groupe
                    </button>
                  </div>

                  {isPreviewOpen && previewSheet ? (
                    <section className="character-widget system-builder__preview">
                      <header className="character-widget__header">
                        <div>
                          <h4 style={{ margin: 0 }}>Preview fiche finale</h4>
                          <p style={{ margin: '0.25rem 0 0', color: '#475467' }}>{previewSheet.name}</p>
                        </div>
                      </header>

                      {previewSheet.fields.some((field) => field.isPrimary) ? (
                        <section className="character-widget__summary">
                          <h4 style={{ margin: 0 }}>Resume</h4>
                          <div className="character-widget__summary-grid">
                            {previewSheet.fields.filter((field) => field.isPrimary).map((field) => renderPreviewField(field))}
                          </div>
                        </section>
                      ) : null}

                      {previewSheet.groups.map((group) => {
                        const groupedFields = previewSheet.fields.filter((field) => field.groupId === group.id && !field.isPrimary);
                        if (groupedFields.length === 0) {
                          return null;
                        }

                        return (
                          <section key={group.id} className="character-widget__group">
                            <h4 style={{ margin: 0 }}>{group.label}</h4>
                            <div className={group.layout === 'list' ? 'character-fields list' : 'character-fields grid'}>
                              {groupedFields.map((field) => renderPreviewField(field))}
                            </div>
                          </section>
                        );
                      })}
                    </section>
                  ) : null}

                  <div className="system-builder__reference-fields">
                    <p style={{ margin: 0, color: '#475467', fontSize: '0.82rem' }}>
                      Glisse-depose les champs pour reordonner, ou depose-les sur un autre groupe pour les deplacer.
                    </p>
                    {selectedReferenceSheet.groups.map((group) => {
                      const fieldsInGroup = selectedReferenceSheet.fields.filter((field) => field.groupId === group.id);
                      return (
                        <section
                          key={group.id}
                          className="system-builder__reference-group"
                          onDragOver={(event) => {
                            event.preventDefault();
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (!draggedFieldId) {
                              return;
                            }
                            updateSelectedReferenceSheet((sheet) => ({
                              ...sheet,
                              fields: moveFieldToGroup(sheet.fields, draggedFieldId, group.id)
                            }));
                            setDraggedFieldId(null);
                            setDropTargetFieldId(null);
                          }}
                        >
                          <header className="system-builder__reference-group-header">
                            <input
                              type="text"
                              value={group.label}
                              onChange={(event) => {
                                const label = event.target.value;
                                updateSelectedReferenceSheet((sheet) => ({
                                  ...sheet,
                                  groups: sheet.groups.map((item) => (item.id === group.id ? { ...item, label } : item))
                                }));
                              }}
                            />
                            <select
                              value={group.layout ?? 'grid'}
                              onChange={(event) => {
                                const layout = event.target.value as SheetGroup['layout'];
                                updateSelectedReferenceSheet((sheet) => ({
                                  ...sheet,
                                  groups: sheet.groups.map((item) => (item.id === group.id ? { ...item, layout } : item))
                                }));
                              }}
                            >
                              <option value="grid">Grid</option>
                              <option value="list">List</option>
                            </select>
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => {
                                if (selectedReferenceSheet.groups.length <= 1) {
                                  return;
                                }
                                const fallbackGroupId = selectedReferenceSheet.groups.find((item) => item.id !== group.id)?.id;
                                if (!fallbackGroupId) {
                                  return;
                                }

                                updateSelectedReferenceSheet((sheet) => ({
                                  ...sheet,
                                  groups: sheet.groups.filter((item) => item.id !== group.id),
                                  fields: sheet.fields.map((field) =>
                                    field.groupId === group.id ? { ...field, groupId: fallbackGroupId } : field
                                  )
                                }));
                                if (selectedFieldGroupId === group.id) {
                                  setSelectedFieldGroupId(fallbackGroupId);
                                }
                              }}
                              disabled={selectedReferenceSheet.groups.length <= 1}
                            >
                              Supprimer groupe
                            </button>
                          </header>

                          <div className="system-builder__reference-group-fields">
                            {fieldsInGroup.length === 0 ? <p style={{ margin: 0 }}>Aucun champ dans ce groupe.</p> : null}
                            {fieldsInGroup.map((field) => (
                              <article
                                key={field.id}
                                className={`system-builder__reference-field ${dropTargetFieldId === field.id ? 'is-drop-target' : ''}`}
                                draggable
                                onDragStart={() => {
                                  setDraggedFieldId(field.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedFieldId(null);
                                  setDropTargetFieldId(null);
                                }}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  if (draggedFieldId && draggedFieldId !== field.id) {
                                    setDropTargetFieldId(field.id);
                                  }
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  if (!draggedFieldId || draggedFieldId === field.id) {
                                    return;
                                  }

                                  updateSelectedReferenceSheet((sheet) => ({
                                    ...sheet,
                                    fields: reorderFields(
                                      moveFieldToGroup(sheet.fields, draggedFieldId, field.groupId),
                                      draggedFieldId,
                                      field.id
                                    )
                                  }));
                                  setDraggedFieldId(null);
                                  setDropTargetFieldId(null);
                                }}
                              >
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    updateSelectedReferenceSheet((sheet) => ({
                                      ...sheet,
                                      fields: sheet.fields.map((item) => (item.id === field.id ? { ...item, label: value } : item))
                                    }));
                                  }}
                                />
                                {field.type === 'number' || field.type === 'resource' ? (
                                  <input
                                    type="number"
                                    value={typeof field.value === 'number' ? field.value : Number(field.value) || 0}
                                    onChange={(event) => {
                                      const value = Number(event.target.value) || 0;
                                      updateSelectedReferenceSheet((sheet) => ({
                                        ...sheet,
                                        fields: sheet.fields.map((item) => (item.id === field.id ? { ...item, value } : item))
                                      }));
                                    }}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={String(field.value)}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      updateSelectedReferenceSheet((sheet) => ({
                                        ...sheet,
                                        fields: sheet.fields.map((item) => (item.id === field.id ? { ...item, value } : item))
                                      }));
                                    }}
                                  />
                                )}
                                {field.type === 'resource' ? (
                                  <input
                                    type="number"
                                    value={field.max ?? 0}
                                    onChange={(event) => {
                                      const max = Math.max(0, Number(event.target.value) || 0);
                                      updateSelectedReferenceSheet((sheet) => ({
                                        ...sheet,
                                        fields: sheet.fields.map((item) => (item.id === field.id ? { ...item, max } : item))
                                      }));
                                    }}
                                  />
                                ) : (
                                  <span style={{ color: '#667085', fontSize: '0.8rem' }}>{field.type}</span>
                                )}
                                <button
                                  className="button secondary"
                                  type="button"
                                  onClick={() => {
                                    updateSelectedReferenceSheet((sheet) => ({
                                      ...sheet,
                                      fields: sheet.fields.filter((item) => item.id !== field.id)
                                    }));
                                  }}
                                >
                                  Supprimer
                                </button>
                              </article>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: 0 }}>Aucun template. Cree un template pour permettre la creation de fiches en session.</p>
          )}
        </section>

        <div className="system-builder__toolbar">
        <button className="button secondary" type="button" onClick={() => addBlock('set_secondary_stat')}>
          + Bloc stat secondaire
        </button>
        <button className="button secondary" type="button" onClick={() => addBlock('define_roll')}>
          + Bloc jet de de
        </button>
        <button className="button" type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder les regles'}
        </button>
        </div>

        {statusMessage ? <p style={{ margin: 0, color: '#067647' }}>{statusMessage}</p> : null}

        {draftProgram.length === 0 ? (
          <p style={{ margin: 0 }}>Aucun bloc. Ajoute un bloc pour definir les calculs et jets.</p>
        ) : (
          <div className="system-builder__list">
          {draftProgram.map((block) => (
            <article
              key={block.id}
              className={`system-block ${dropTargetBlockId === block.id ? 'is-drop-target' : ''}`}
              draggable
              onDragStart={() => {
                setDraggedBlockId(block.id);
              }}
              onDragEnd={() => {
                setDraggedBlockId(null);
                setDropTargetBlockId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (draggedBlockId && draggedBlockId !== block.id) {
                  setDropTargetBlockId(block.id);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!draggedBlockId || draggedBlockId === block.id) {
                  return;
                }
                setDraftProgram((previous) => reorderBlocks(previous, draggedBlockId, block.id));
                setDraggedBlockId(null);
                setDropTargetBlockId(null);
              }}
            >
              <header className="system-block__header">
                <strong>{block.type === 'set_secondary_stat' ? 'Bloc stat secondaire' : 'Bloc jet de de'}</strong>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setDraftProgram((previous) => previous.filter((item) => item.id !== block.id));
                  }}
                >
                  Supprimer
                </button>
              </header>

              {block.type === 'set_secondary_stat' ? (
                <div className="system-block__content">
                  <label>
                    <span>Nom de la stat</span>
                    <input
                      type="text"
                      value={block.label}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateBlock(block.id, (current) =>
                          current.type === 'set_secondary_stat'
                            ? {
                                ...current,
                                label: value
                              }
                            : current
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>Champ cible</span>
                    <select
                      value={block.targetFieldId}
                      onChange={(event) => {
                        const targetFieldId = event.target.value;
                        updateBlock(block.id, (current) =>
                          current.type === 'set_secondary_stat'
                            ? {
                                ...current,
                                targetFieldId
                              }
                            : current
                        );
                      }}
                    >
                      {numericFieldOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                      {!numericFieldOptions.some((option) => option.id === block.targetFieldId) ? (
                        <option value={block.targetFieldId}>{block.targetFieldId}</option>
                      ) : null}
                    </select>
                  </label>

                  <label>
                    <span>Operation</span>
                    <select
                      value={block.operation}
                      onChange={(event) => {
                        const operation = event.target.value as SetSecondaryStatBlock['operation'];
                        updateBlock(block.id, (current) =>
                          current.type === 'set_secondary_stat'
                            ? {
                                ...current,
                                operation
                              }
                            : current
                        );
                      }}
                    >
                      <option value="sum">Somme</option>
                      <option value="subtract">Soustraction</option>
                      <option value="multiply">Multiplication</option>
                      <option value="average">Moyenne</option>
                    </select>
                  </label>

                  <label>
                    <span>Arrondi</span>
                    <select
                      value={block.rounding ?? 'none'}
                      onChange={(event) => {
                        const rounding = event.target.value as SetSecondaryStatBlock['rounding'];
                        updateBlock(block.id, (current) =>
                          current.type === 'set_secondary_stat'
                            ? {
                                ...current,
                                rounding
                              }
                            : current
                        );
                      }}
                    >
                      <option value="none">Aucun</option>
                      <option value="floor">Inferieur</option>
                      <option value="ceil">Superieur</option>
                      <option value="round">Math classique</option>
                    </select>
                  </label>

                  <label>
                    <span>Modificateur fixe</span>
                    <input
                      type="number"
                      value={block.constantModifier ?? 0}
                      onChange={(event) => {
                        const constantModifier = Number(event.target.value) || 0;
                        updateBlock(block.id, (current) =>
                          current.type === 'set_secondary_stat'
                            ? {
                                ...current,
                                constantModifier
                              }
                            : current
                        );
                      }}
                    />
                  </label>

                  <div className="system-block__sources">
                    <span>Champs sources</span>
                    {(block.sourceFieldIds.length === 0 ? [''] : block.sourceFieldIds).map((fieldId, index) => (
                      <div key={`${block.id}-source-${index}`} className="system-block__source-row">
                        <select
                          value={fieldId}
                          onChange={(event) => {
                            const nextFieldId = event.target.value;
                            updateBlock(block.id, (current) => {
                              if (current.type !== 'set_secondary_stat') {
                                return current;
                              }

                              const nextSources = [...current.sourceFieldIds];
                              if (nextSources.length === 0) {
                                nextSources.push(nextFieldId);
                              } else {
                                nextSources[index] = nextFieldId;
                              }

                              return {
                                ...current,
                                sourceFieldIds: nextSources.filter(Boolean)
                              };
                            });
                          }}
                        >
                          <option value="">Selectionner</option>
                          {numericFieldOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => {
                            updateBlock(block.id, (current) => {
                              if (current.type !== 'set_secondary_stat') {
                                return current;
                              }

                              return {
                                ...current,
                                sourceFieldIds: current.sourceFieldIds.filter((_, sourceIndex) => sourceIndex !== index)
                              };
                            });
                          }}
                        >
                          -
                        </button>
                      </div>
                    ))}
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => {
                        updateBlock(block.id, (current) => {
                          if (current.type !== 'set_secondary_stat') {
                            return current;
                          }

                          return {
                            ...current,
                            sourceFieldIds: [...current.sourceFieldIds, firstFieldId ?? '']
                          };
                        });
                      }}
                    >
                      + Ajouter source
                    </button>
                  </div>
                </div>
              ) : (
                <div className="system-block__content">
                  <label>
                    <span>Nom du jet</span>
                    <input
                      type="text"
                      value={block.label}
                      onChange={(event) => {
                        const label = event.target.value;
                        updateBlock(block.id, (current) =>
                          current.type === 'define_roll'
                            ? {
                                ...current,
                                label
                              }
                            : current
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>Identifiant action</span>
                    <input
                      type="text"
                      value={block.actionId}
                      onChange={(event) => {
                        const actionId = event.target.value;
                        updateBlock(block.id, (current) =>
                          current.type === 'define_roll'
                            ? {
                                ...current,
                                actionId
                              }
                            : current
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>Description</span>
                    <input
                      type="text"
                      value={block.description ?? ''}
                      onChange={(event) => {
                        const description = event.target.value;
                        updateBlock(block.id, (current) =>
                          current.type === 'define_roll'
                            ? {
                                ...current,
                                description
                              }
                            : current
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>Nombre de des</span>
                    <input
                      type="number"
                      min={1}
                      value={block.diceCount}
                      onChange={(event) => {
                        const diceCount = Math.max(1, Number(event.target.value) || 1);
                        updateBlock(block.id, (current) =>
                          current.type === 'define_roll'
                            ? {
                                ...current,
                                diceCount
                              }
                            : current
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>Faces du de</span>
                    <input
                      type="number"
                      min={2}
                      value={block.diceSides}
                      onChange={(event) => {
                        const diceSides = Math.max(2, Number(event.target.value) || 20);
                        updateBlock(block.id, (current) =>
                          current.type === 'define_roll'
                            ? {
                                ...current,
                                diceSides
                              }
                            : current
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>Champ modificateur</span>
                    <select
                      value={block.modifierFieldId ?? ''}
                      onChange={(event) => {
                        const modifierFieldId = event.target.value || undefined;
                        updateBlock(block.id, (current) =>
                          current.type === 'define_roll'
                            ? {
                                ...current,
                                modifierFieldId
                              }
                            : current
                        );
                      }}
                    >
                      <option value="">Aucun</option>
                      {numericFieldOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Bonus fixe</span>
                    <input
                      type="number"
                      value={block.flatModifier ?? 0}
                      onChange={(event) => {
                        const flatModifier = Number(event.target.value) || 0;
                        updateBlock(block.id, (current) =>
                          current.type === 'define_roll'
                            ? {
                                ...current,
                                flatModifier
                              }
                            : current
                        );
                      }}
                    />
                  </label>
                </div>
              )}
            </article>
          ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}
