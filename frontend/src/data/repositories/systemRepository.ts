import { db, ensureDatabaseIsInitialized } from '../db';
import { GameSystem } from '../../types/system';

export const systemRepository = {
  async list(): Promise<GameSystem[]> {
    await ensureDatabaseIsInitialized();
    return db.systems.orderBy('updatedAt').reverse().toArray();
  },

  async getById(systemId: string): Promise<GameSystem | null> {
    await ensureDatabaseIsInitialized();
    const system = await db.systems.get(systemId);
    return system ?? null;
  }
};
