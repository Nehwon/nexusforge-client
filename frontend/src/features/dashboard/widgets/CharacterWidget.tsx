import { useEffect, useMemo, useRef, useState } from 'react';
import { characterRepository, systemRepository } from '../../../data/repositories';
import { applyRulesProgramToSheet, rollForAction } from '../../../services/systemRulesEngine';
import { sendSystemMessage } from '../../../stores/chatStore';
import { Character } from '../../../types/character';
import { CharacterSheetView, SheetAction, SheetField } from '../../../types/characterSheet';
import { Session } from '../../../types/session';
import { GameSystem } from '../../../types/system';
import { User } from '../../../types/user';

type CharacterWidgetProps = {
  currentUser: User;
  currentSession: Session;
  role: 'gm' | 'player';
};

function renderResourceField(
  field: SheetField,
  options?: {
    canEdit: boolean;
    onDecrease: () => void;
    onIncrease: () => void;
  }
) {
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
      {options?.canEdit ? (
        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
          <button className="button secondary" type="button" onClick={options.onDecrease}>
            -1
          </button>
          <button className="button secondary" type="button" onClick={options.onIncrease}>
            +1
          </button>
        </div>
      ) : null}
    </article>
  );
}

function renderField(field: SheetField) {
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

function canEditCharacter(character: Character, currentUser: User, role: 'gm' | 'player'): boolean {
  return role === 'gm' || character.ownerUserId === currentUser.id;
}

type StudioRuntimeValues = Record<string, string | number | boolean | string[]>;

function defaultStudioValue(component: NonNullable<GameSystem['studioSchema']>['views'][number]['components'][number]) {
  if (component.type === 'checkbox') {
    return Boolean(component.defaultValue);
  }
  if (component.type === 'number' || component.type === 'range') {
    return typeof component.defaultValue === 'number' ? component.defaultValue : 0;
  }
  if (component.type === 'choice' || component.type === 'tabs' || component.type === 'tabs_nested') {
    return typeof component.defaultValue === 'string' ? component.defaultValue : component.options?.[0] ?? '';
  }
  if (component.type === 'relation') {
    return component.allowMultiple ? [] : '';
  }
  return typeof component.defaultValue === 'string' ? component.defaultValue : '';
}

function toNumeric(value: StudioRuntimeValues[string] | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function evalFormula(formula: string, values: StudioRuntimeValues): number | null {
  const withValues = formula.replace(/@([A-Za-z0-9_]+)/g, (_, key: string) => String(toNumeric(values[key])));
  if (!/^[0-9+\-*/().\s]+$/.test(withValues)) {
    return null;
  }
  try {
    const result = new Function(`return (${withValues});`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function applyStudioFormulas(
  components: NonNullable<GameSystem['studioSchema']>['views'][number]['components'],
  values: StudioRuntimeValues
): StudioRuntimeValues {
  let next = { ...values };
  for (let i = 0; i < 4; i += 1) {
    let changed = false;
    for (const component of components) {
      if (!component.formula?.trim()) {
        continue;
      }
      const computed = evalFormula(component.formula.trim(), next);
      if (computed === null) {
        continue;
      }
      if (next[component.key] !== computed) {
        next[component.key] = computed;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return next;
}

function rollStudioDice(formula: string, values: StudioRuntimeValues): { total: number; detail: string } | null {
  const raw = formula.trim().replace(/@([A-Za-z0-9_]+)/g, (_, key: string) => String(toNumeric(values[key])));
  const compact = raw.replace(/\s+/g, '');
  const match = compact.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    const fallback = evalFormula(compact, values);
    if (fallback === null) {
      return null;
    }
    return { total: fallback, detail: compact };
  }

  const diceCount = Math.max(1, Number(match[1] || '1'));
  const diceSides = Math.max(2, Number(match[2]));
  const modifier = Number(match[3] || '0');
  const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceSides) + 1);
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  return {
    total,
    detail: `${rolls.join(' + ')}${modifier ? ` ${modifier > 0 ? '+' : '-'} ${Math.abs(modifier)}` : ''}`
  };
}

function studioRuntimeStorageKey(sessionId: string, viewId: string): string {
  return `studioRuntime:${sessionId}:${viewId}`;
}

function parseStoredRuntime(raw: string | number | boolean | null | undefined): StudioRuntimeValues | null {
  if (typeof raw !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StudioRuntimeValues) : null;
  } catch {
    return null;
  }
}

function executeButtonScript(
  script: string,
  values: StudioRuntimeValues
): { nextValues: StudioRuntimeValues; messages: string[] } {
  const commands = script
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  let nextValues = { ...values };
  const messages: string[] = [];

  for (const command of commands) {
    const rollMatch = command.match(/^roll\s+(.+)$/i);
    if (rollMatch) {
      const [, expr] = rollMatch;
      const roll = rollStudioDice(expr, nextValues);
      if (roll) {
        messages.push(`roll ${expr} = ${roll.total} (${roll.detail})`);
      }
      continue;
    }

    const setMatch = command.match(/^(?:set\s+)?([A-Za-z0-9_]+)\s*=\s*(.+)$/i);
    if (setMatch) {
      const [, target, expr] = setMatch;
      const result = evalFormula(expr, nextValues);
      if (result !== null) {
        nextValues[target] = result;
        messages.push(`set ${target} = ${result}`);
      }
      continue;
    }

    const addMatch = command.match(/^add\s+([A-Za-z0-9_]+)\s+(-?\d+(?:\.\d+)?)$/i);
    if (addMatch) {
      const [, target, deltaRaw] = addMatch;
      const delta = Number(deltaRaw);
      const next = toNumeric(nextValues[target]) + delta;
      nextValues[target] = next;
      messages.push(`add ${target} ${delta > 0 ? '+' : ''}${delta}`);
      continue;
    }

    const toggleMatch = command.match(/^toggle\s+([A-Za-z0-9_]+)$/i);
    if (toggleMatch) {
      const [, target] = toggleMatch;
      nextValues[target] = !Boolean(nextValues[target]);
      messages.push(`toggle ${target}`);
      continue;
    }
  }

  return { nextValues, messages };
}

export default function CharacterWidget({ currentUser, currentSession, role }: CharacterWidgetProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentSystem, setCurrentSystem] = useState<GameSystem | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRollResult, setLastRollResult] = useState<string | null>(null);
  const [selectedStudioViewId, setSelectedStudioViewId] = useState<string>('');
  const [studioRuntimeValues, setStudioRuntimeValues] = useState<StudioRuntimeValues>({});
  const [lastStudioRollResult, setLastStudioRollResult] = useState<string | null>(null);
  const persistRuntimeTimeoutRef = useRef<number | null>(null);
  const lastPersistedRuntimeRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;

    async function loadCharactersAndSystem() {
      try {
        const localCharacters = await characterRepository.listForSession({
          sessionId: currentSession.id,
          role,
          currentUserId: currentUser.id
        });

        if (isMounted) {
          setCharacters(localCharacters);
          setSelectedCharacterId((current) => current ?? localCharacters[0]?.id ?? null);
        }

        const system = await systemRepository.getById(currentSession.systemId);
        if (isMounted) {
          setCurrentSystem(system);
          setSelectedTemplateId((current) => current ?? system?.referenceSheets?.[0]?.id ?? null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les fiches.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCharactersAndSystem();

    const handleSystemUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ systemId?: string }>;
      if (customEvent.detail?.systemId && customEvent.detail.systemId !== currentSession.systemId) {
        return;
      }
      void loadCharactersAndSystem();
    };

    window.addEventListener('system-updated', handleSystemUpdated as EventListener);

    return () => {
      isMounted = false;
      window.removeEventListener('system-updated', handleSystemUpdated as EventListener);
    };
  }, [currentSession.id, currentSession.systemId, currentUser.id, role]);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId]
  );
  const selectedSheet: CharacterSheetView | null = useMemo(() => {
    if (!selectedCharacter?.sheet) {
      return null;
    }

    return applyRulesProgramToSheet(selectedCharacter.sheet, currentSystem);
  }, [currentSystem, selectedCharacter?.id, selectedCharacter?.sheet]);

  const availableActions: SheetAction[] =
    selectedSheet?.actions ??
    currentSystem?.rollDefinitions?.map((roll) => ({
      id: roll.id,
      label: roll.label,
      description: roll.description,
      rollFormula: roll.formula
    })) ??
    [];

  const primaryFields = selectedSheet?.fields.filter((field) => field.isPrimary) ?? [];
  const availableTemplates = currentSystem?.referenceSheets ?? [];
  const availableStudioViews = currentSystem?.studioSchema?.views ?? [];
  const selectedStudioView =
    availableStudioViews.find((view) => view.id === selectedStudioViewId) ?? availableStudioViews[0] ?? null;

  useEffect(() => {
    if (!currentSystem?.studioSchema?.views?.length) {
      setSelectedStudioViewId('');
      setStudioRuntimeValues({});
      return;
    }
    setSelectedStudioViewId((current) => current || currentSystem.studioSchema?.views?.[0]?.id || '');
  }, [currentSystem?.id, currentSystem?.studioSchema?.views]);

  useEffect(() => {
    if (!selectedStudioView) {
      setStudioRuntimeValues({});
      return;
    }
    const base = selectedStudioView.components.reduce<StudioRuntimeValues>((acc, component) => {
      acc[component.key] = defaultStudioValue(component);
      return acc;
    }, {});
    const key = studioRuntimeStorageKey(currentSession.id, selectedStudioView.id);
    const stored = parseStoredRuntime(selectedCharacter?.attributes?.[key]);
    const merged = {
      ...base,
      ...(stored ?? {})
    };
    const computed = applyStudioFormulas(selectedStudioView.components, merged);
    setStudioRuntimeValues(computed);
    lastPersistedRuntimeRef.current = JSON.stringify(computed);
    setLastStudioRollResult(null);
  }, [currentSession.id, selectedCharacter?.id, selectedCharacter?.attributes, selectedStudioView?.id, selectedStudioView?.components]);

  useEffect(() => {
    if (!selectedCharacter || !selectedStudioView) {
      return;
    }

    const serialized = JSON.stringify(studioRuntimeValues);
    if (serialized === lastPersistedRuntimeRef.current) {
      return;
    }

    if (persistRuntimeTimeoutRef.current !== null) {
      window.clearTimeout(persistRuntimeTimeoutRef.current);
    }

    persistRuntimeTimeoutRef.current = window.setTimeout(() => {
      const key = studioRuntimeStorageKey(currentSession.id, selectedStudioView.id);
      void characterRepository
        .updateAttributes({
          characterId: selectedCharacter.id,
          patch: {
            [key]: serialized
          }
        })
        .then((updated) => {
          if (!updated) {
            return;
          }
          lastPersistedRuntimeRef.current = serialized;
          setCharacters((previous) => previous.map((character) => (character.id === updated.id ? updated : character)));
        })
        .catch(() => {
          // keep runtime local even if persistence fails
        });
    }, 1200);

    return () => {
      if (persistRuntimeTimeoutRef.current !== null) {
        window.clearTimeout(persistRuntimeTimeoutRef.current);
        persistRuntimeTimeoutRef.current = null;
      }
    };
  }, [currentSession.id, selectedCharacter, selectedStudioView, studioRuntimeValues]);

  const handleResourceDelta = async (fieldId: string, delta: number) => {
    if (!selectedCharacter || !selectedSheet) {
      return;
    }

    const field = selectedSheet.fields.find((item) => item.id === fieldId && item.type === 'resource');
    if (!field) {
      return;
    }

    const currentValue = typeof field.value === 'number' ? field.value : Number(field.value) || 0;
    const max = field.max ?? currentValue;
    const nextValue = Math.max(0, Math.min(max, currentValue + delta));

    try {
      const updated = await characterRepository.updateResource({
        characterId: selectedCharacter.id,
        fieldId,
        value: nextValue
      });

      if (!updated) {
        return;
      }

      setCharacters((previous) => previous.map((character) => (character.id === updated.id ? updated : character)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de mettre a jour la ressource.');
    }
  };

  const handleActionRoll = (action: SheetAction) => {
    if (!selectedCharacter) {
      return;
    }

    if (!selectedSheet) {
      return;
    }

    const result = rollForAction(action, selectedSheet);
    const text = `${selectedCharacter.name} lance ${action.label}: ${result.total} (${result.breakdown})`;
    setLastRollResult(text);

    sendSystemMessage({
      sessionId: currentSession.id,
      content: text,
      systemType: 'roll'
    });
  };

  const handleCreateCharacterFromTemplate = async () => {
    if (!currentSystem || !selectedTemplateId) {
      return;
    }

    const template = availableTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) {
      setErrorMessage('Template de reference introuvable.');
      return;
    }

    try {
      const created = await characterRepository.createFromReferenceSheet({
        sessionId: currentSession.id,
        systemId: currentSystem.id,
        templateId: selectedTemplateId,
        template,
        ownerUserId: role === 'player' ? currentUser.id : null,
        name: newCharacterName.trim() || template.name
      });

      setCharacters((previous) => [...previous, created]);
      setSelectedCharacterId(created.id);
      setNewCharacterName('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de creer la fiche depuis le template.');
    }
  };

  const setStudioRuntimeValue = (
    component: NonNullable<GameSystem['studioSchema']>['views'][number]['components'][number],
    value: string | number | boolean | string[]
  ) => {
    if (!selectedStudioView) {
      return;
    }
    const next = applyStudioFormulas(selectedStudioView.components, {
      ...studioRuntimeValues,
      [component.key]: value
    });
    setStudioRuntimeValues(next);
  };

  const handleStudioButtonAction = (
    component: NonNullable<GameSystem['studioSchema']>['views'][number]['components'][number]
  ) => {
    if (!selectedStudioView) {
      return;
    }

    const script = component.formula?.trim() || '';
    if (!script) {
      setLastStudioRollResult('Aucun script/formule sur ce bouton.');
      return;
    }

    const { nextValues, messages } = executeButtonScript(script, studioRuntimeValues);
    const computed = applyStudioFormulas(selectedStudioView.components, nextValues);
    setStudioRuntimeValues(computed);

    const message = messages.length > 0 ? messages.join(' | ') : `script execute: ${script}`;
    setLastStudioRollResult(`${component.label}: ${message}`);

    sendSystemMessage({
      sessionId: currentSession.id,
      content: `[Studio] ${selectedCharacter?.name || 'Personnage'} -> ${component.label}: ${message}`,
      systemType: 'roll'
    });
  };

  return (
    <div className="character-widget">
      {isLoading ? <p style={{ margin: 0 }}>Chargement de la fiche...</p> : null}
      {errorMessage ? <p style={{ color: '#b42318', margin: 0 }}>{errorMessage}</p> : null}
      {!isLoading && !errorMessage && characters.length === 0 ? <p style={{ margin: 0 }}>Aucune fiche disponible.</p> : null}

      {!isLoading && !errorMessage && availableTemplates.length > 0 ? (
        <section className="character-widget__actions">
          <h4 style={{ margin: 0 }}>Creer une fiche depuis un modele</h4>
          <div style={{ display: 'grid', gap: '0.45rem', gridTemplateColumns: '1fr 1fr auto' }}>
            <select
              value={selectedTemplateId ?? ''}
              onChange={(event) => {
                setSelectedTemplateId(event.target.value);
              }}
              style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '0.45rem' }}
            >
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newCharacterName}
              placeholder="Nom de la fiche"
              onChange={(event) => setNewCharacterName(event.target.value)}
              style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '0.45rem' }}
            />
            <button className="button secondary" type="button" onClick={() => void handleCreateCharacterFromTemplate()}>
              Creer
            </button>
          </div>
        </section>
      ) : null}

      {!isLoading && !errorMessage && characters.length > 0 && selectedCharacter && selectedSheet ? (
        <>
          {role === 'gm' && characters.length > 1 ? (
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Fiche active</span>
              <select
                value={selectedCharacter.id}
                onChange={(event) => setSelectedCharacterId(event.target.value)}
                style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '0.45rem' }}
              >
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <header className="character-widget__header">
            {selectedSheet.portraitUrl ? (
              <img
                src={selectedSheet.portraitUrl}
                alt={`Portrait de ${selectedSheet.name}`}
                className="character-widget__portrait"
              />
            ) : null}
            <div>
              <h3 style={{ margin: 0 }}>{selectedSheet.name}</h3>
              <p style={{ margin: '0.3rem 0 0', color: '#475467' }}>
                {currentSystem ? `${currentSystem.name} - ` : ''}Fiche locale synchronisable
              </p>
            </div>
          </header>

          {lastRollResult ? (
            <p style={{ margin: 0, color: '#155eef' }}>
              Dernier jet: <strong>{lastRollResult}</strong>
            </p>
          ) : null}

          {primaryFields.length > 0 ? (
            <section className="character-widget__summary">
              <h4 style={{ margin: 0 }}>Resume</h4>
              <div className="character-widget__summary-grid">
                {primaryFields.map((field) =>
                  field.type === 'resource'
                    ? renderResourceField(field, {
                        canEdit: canEditCharacter(selectedCharacter, currentUser, role),
                        onDecrease: () => {
                          void handleResourceDelta(field.id, -1);
                        },
                        onIncrease: () => {
                          void handleResourceDelta(field.id, 1);
                        }
                      })
                    : renderField(field)
                )}
              </div>
            </section>
          ) : null}

          {selectedSheet.groups.map((group) => {
            const groupedFields = selectedSheet.fields.filter((field) => field.groupId === group.id && !field.isPrimary);
            return (
              <section key={group.id} className="character-widget__group">
                <h4 style={{ margin: 0 }}>{group.label}</h4>
                <div className={group.layout === 'list' ? 'character-fields list' : 'character-fields grid'}>
                  {groupedFields.map((field) => renderField(field))}
                </div>
              </section>
            );
          })}

          {availableActions.length > 0 ? (
            <section className="character-widget__actions">
              <h4 style={{ margin: 0 }}>Actions</h4>
              <div className="character-widget__actions-list">
                {availableActions.map((action) => (
                  <button
                    type="button"
                    className="button secondary"
                    key={action.id}
                    onClick={() => {
                      handleActionRoll(action);
                    }}
                    title={action.description}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {selectedStudioView ? (
            <section className="character-widget__actions">
              <h4 style={{ margin: 0 }}>Fiche Studio (runtime beta)</h4>
              {availableStudioViews.length > 1 ? (
                <label style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
                  <span>Vue studio</span>
                  <select
                    value={selectedStudioView.id}
                    onChange={(event) => setSelectedStudioViewId(event.target.value)}
                    style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '0.45rem' }}
                  >
                    {availableStudioViews.map((view) => (
                      <option key={view.id} value={view.id}>
                        {view.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {lastStudioRollResult ? <p style={{ marginBottom: 0 }}>{lastStudioRollResult}</p> : null}

              <div className="studio-runtime-grid" style={{ marginTop: '0.65rem' }}>
                {selectedStudioView.components.map((component) => {
                  const value = studioRuntimeValues[component.key];
                  return (
                    <article key={`studio-runtime-${component.id}`} className="studio-runtime-item">
                      <strong>{component.label || component.key}</strong>
                      <small>{component.key}</small>

                      {component.type === 'text' || component.type === 'color' || component.type === 'date' || component.type === 'time' || component.type === 'avatar' ? (
                        <input
                          type={component.type === 'color' ? 'color' : component.type === 'date' ? 'date' : component.type === 'time' ? 'time' : 'text'}
                          value={typeof value === 'string' ? value : ''}
                          onChange={(event) => setStudioRuntimeValue(component, event.target.value)}
                        />
                      ) : null}
                      {component.type === 'textarea' ? (
                        <textarea rows={2} value={typeof value === 'string' ? value : ''} onChange={(event) => setStudioRuntimeValue(component, event.target.value)} />
                      ) : null}
                      {component.type === 'number' || component.type === 'range' ? (
                        <input
                          type={component.type === 'number' ? 'number' : 'range'}
                          min={component.min ?? 0}
                          max={component.max ?? 100}
                          step={component.step ?? 1}
                          value={typeof value === 'number' ? value : 0}
                          onChange={(event) => setStudioRuntimeValue(component, Number(event.target.value))}
                        />
                      ) : null}
                      {component.type === 'checkbox' ? (
                        <label>
                          <input type="checkbox" checked={Boolean(value)} onChange={(event) => setStudioRuntimeValue(component, event.target.checked)} /> active
                        </label>
                      ) : null}
                      {component.type === 'choice' || component.type === 'tabs' || component.type === 'tabs_nested' ? (
                        <select value={typeof value === 'string' ? value : ''} onChange={(event) => setStudioRuntimeValue(component, event.target.value)}>
                          {(component.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {component.type === 'button' ? (
                        <button
                          className="button secondary"
                          onClick={() => {
                            handleStudioButtonAction(component);
                          }}
                        >
                          {String(component.defaultValue || component.label || 'Action')}
                        </button>
                      ) : null}
                      {component.type === 'dice_roll' ? (
                        <button
                          className="button secondary"
                          onClick={() => {
                            const result = rollStudioDice(component.diceFormula || component.formula || '1d20', studioRuntimeValues);
                            if (!result) {
                              setLastStudioRollResult(`Jet invalide: ${component.diceFormula || component.formula || ''}`);
                              return;
                            }
                            const text = `${selectedCharacter?.name || 'Personnage'} lance ${component.label}: ${result.total} (${result.detail})`;
                            setLastStudioRollResult(text);
                            sendSystemMessage({
                              sessionId: currentSession.id,
                              content: `[Studio] ${text}`,
                              systemType: 'roll'
                            });
                          }}
                        >
                          Lancer ({component.diceFormula || component.formula || '1d20'})
                        </button>
                      ) : null}
                      {component.type === 'table' || component.type === 'inventory' ? (
                        <small>Colonnes: {(component.columns ?? []).join(', ') || '-'}</small>
                      ) : null}
                      {component.type === 'relation' ? (
                        <select value={typeof value === 'string' ? value : ''} onChange={(event) => setStudioRuntimeValue(component, event.target.value)}>
                          <option value="">Cible</option>
                          {selectedStudioView.components.map((candidate) => (
                            <option key={candidate.key} value={candidate.key}>
                              {candidate.key}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {component.formula ? <small>formule: {component.formula}</small> : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
