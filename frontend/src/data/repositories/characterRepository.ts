import { db, ensureDatabaseIsInitialized } from '../db';
import { Character } from '../../types/character';
import { CharacterSheetView } from '../../types/characterSheet';
import { localActionRepository } from './localActionRepository';
import { isBackendEnabled, requestJson } from '../../services/apiClient';

export const characterRepository = {
  async listForSession(params: { sessionId: string; role: 'gm' | 'player'; currentUserId: string }): Promise<Character[]> {
    await ensureDatabaseIsInitialized();
    const all = await db.characters.where('sessionId').equals(params.sessionId).toArray();

    if (params.role === 'gm') {
      return all;
    }

    return all.filter((character) => character.ownerUserId === params.currentUserId);
  },

  async getById(characterId: string): Promise<Character | null> {
    await ensureDatabaseIsInitialized();
    const character = await db.characters.get(characterId);
    return character ?? null;
  },

  async createFromReferenceSheet(params: {
    sessionId: string;
    systemId: string;
    templateId: string;
    template: CharacterSheetView;
    ownerUserId?: string | null;
    name?: string;
  }): Promise<Character> {
    await ensureDatabaseIsInitialized();

    if (isBackendEnabled()) {
      try {
        const payload = await requestJson<{ character: Character }>({
          path: `/api/sessions/${params.sessionId}/characters/from-template`,
          method: 'POST',
          withAuth: true,
          body: {
            systemId: params.systemId,
            templateId: params.templateId,
            name: params.name ?? params.template.name,
            ownerUserId: params.ownerUserId ?? null
          }
        });
        await db.characters.put(payload.character);
        return payload.character;
      } catch {
        // fallback local creation
      }
    }

    const characterId = `character-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const characterName = params.name?.trim() || params.template.name || 'Nouveau personnage';

    const clonedSheet: CharacterSheetView = {
      ...params.template,
      id: characterId,
      name: characterName,
      fields: params.template.fields.map((field) => ({ ...field })),
      groups: params.template.groups.map((group) => ({ ...group })),
      actions: params.template.actions?.map((action) => ({ ...action }))
    };

    const character: Character = {
      id: characterId,
      systemId: params.systemId,
      templateId: params.templateId,
      sessionId: params.sessionId,
      name: characterName,
      type: 'pc',
      ownerUserId: params.ownerUserId ?? null,
      sheet: clonedSheet
    };

    await db.characters.put(character);
    await localActionRepository.enqueue({
      entityType: 'character',
      entityId: character.id,
      actionType: 'create',
      payload: character as unknown as Record<string, unknown>
    });

    return character;
  },

  async updateResource(params: { characterId: string; fieldId: string; value: number }): Promise<Character | null> {
    await ensureDatabaseIsInitialized();
    const character = await db.characters.get(params.characterId);
    if (!character || !character.sheet) {
      return null;
    }

    const nextFields = character.sheet.fields.map((field) =>
      field.id === params.fieldId && field.type === 'resource' ? { ...field, value: params.value } : field
    );

    const nextCharacter: Character = {
      ...character,
      sheet: {
        ...character.sheet,
        fields: nextFields
      }
    };

    await db.characters.put(nextCharacter);
    await localActionRepository.enqueue({
      entityType: 'character',
      entityId: character.id,
      actionType: 'update',
      payload: { fieldId: params.fieldId, value: params.value }
    });

    return nextCharacter;
  }
};
