import { db, ensureDatabaseIsInitialized } from '../db';
import { Document } from '../../types/document';
import { localActionRepository } from './localActionRepository';

export const documentRepository = {
  async listForSession(params: {
    sessionId: string;
    currentUserId: string;
    role: 'gm' | 'player';
  }): Promise<Document[]> {
    await ensureDatabaseIsInitialized();

    const documents = await db.documents.where('sessionId').equals(params.sessionId).toArray();
    return documents
      .filter((document) => {
        if (params.role === 'gm') {
          return true;
        }

        if (document.isPublic) {
          return true;
        }

        const sharedWith = document.sharedWithUserIds ?? [];
        return sharedWith.includes(params.currentUserId);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async markAsRead(documentId: string, userId: string): Promise<void> {
    await ensureDatabaseIsInitialized();

    const existing = await db.documents.get(documentId);
    if (!existing) {
      return;
    }

    const readByUserIds = Array.from(new Set([...(existing.readByUserIds ?? []), userId]));
    const updated = { ...existing, readByUserIds };
    await db.documents.put(updated);

    await localActionRepository.enqueue({
      entityType: 'document',
      entityId: documentId,
      actionType: 'update',
      payload: { readByUserIds }
    });
  }
};
