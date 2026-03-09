import { useEffect, useMemo, useState } from 'react';
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

export default function CharacterWidget({ currentUser, currentSession, role }: CharacterWidgetProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [currentSystem, setCurrentSystem] = useState<GameSystem | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRollResult, setLastRollResult] = useState<string | null>(null);

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
        </>
      ) : null}
    </div>
  );
}
