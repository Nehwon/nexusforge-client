import { db, ensureDatabaseIsInitialized } from '../db';
import { Character } from '../../types/character';
import { localActionRepository } from './localActionRepository';

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
