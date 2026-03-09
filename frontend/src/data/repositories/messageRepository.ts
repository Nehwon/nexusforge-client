import { db, ensureDatabaseIsInitialized } from '../db';
import { Message } from '../../types/message';
import { localActionRepository } from './localActionRepository';

export const messageRepository = {
  async listForSession(sessionId: string): Promise<Message[]> {
    await ensureDatabaseIsInitialized();
    return db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('createdAt');
  },

  async create(message: Message): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.messages.put(message);
    await localActionRepository.enqueue({
      entityType: 'message',
      entityId: message.id,
      actionType: 'create',
      payload: { ...message }
    });
  }
};
