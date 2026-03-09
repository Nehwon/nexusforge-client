import { db, ensureDatabaseIsInitialized } from '../db';
import { Note } from '../../types/note';
import { localActionRepository } from './localActionRepository';

export const noteRepository = {
  async listForSession(params: {
    sessionId: string;
    currentUserId: string;
    role: 'gm' | 'player';
  }): Promise<Note[]> {
    await ensureDatabaseIsInitialized();

    const notes = await db.notes.where('scopeRefId').equals(params.sessionId).toArray();
    return notes
      .filter((note) => {
        if (note.type === 'public') {
          return true;
        }

        if (note.type === 'gm_private') {
          return params.role === 'gm';
        }

        return note.ownerUserId === params.currentUserId || note.createdByUserId === params.currentUserId;
      })
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());
  },

  async create(note: Note): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.notes.put(note);
    await localActionRepository.enqueue({
      entityType: 'note',
      entityId: note.id,
      actionType: 'create',
      payload: { ...note }
    });
  }
};
