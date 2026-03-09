import Dexie, { Table } from 'dexie';
import { Character } from '../types/character';
import { DashboardProfile } from '../types/dashboard';
import { Document } from '../types/document';
import { Message } from '../types/message';
import { Note } from '../types/note';
import { Session } from '../types/session';
import { GameSystem } from '../types/system';
import { LocalAction } from '../types/localAction';
import { seededDocuments } from './seeds/documents';
import { seededCharacters } from './seeds/characters';
import { seededMessages } from './seeds/messages';
import { seededNotes } from './seeds/notes';
import { seededSessions } from './seeds/sessions';
import { seededSystems } from './seeds/systems';

class NexusForgeDatabase extends Dexie {
  systems!: Table<GameSystem, string>;
  characters!: Table<Character, string>;
  sessions!: Table<Session, string>;
  notes!: Table<Note, string>;
  messages!: Table<Message, string>;
  documents!: Table<Document, string>;
  localActions!: Table<LocalAction, string>;
  dashboardProfiles!: Table<DashboardProfile, string>;

  constructor() {
    super('nexus-forge-db');

    this.version(1).stores({
      sessions: 'id, gmUserId, state, updatedAt'
    });

    this.version(2).stores({
      systems: 'id, updatedAt',
      characters: 'id, systemId, ownerUserId',
      sessions: 'id, gmUserId, state, updatedAt',
      notes: 'id, type, scope, scopeRefId, updatedAt',
      messages: 'id, sessionId, channelType, channelId, createdAt',
      documents: 'id, ownerUserId, createdAt',
      localActions: 'id, entityType, entityId, createdAt, syncStatus'
    });

    this.version(3).stores({
      systems: 'id, updatedAt',
      characters: 'id, systemId, ownerUserId, sessionId',
      sessions: 'id, gmUserId, state, updatedAt',
      notes: 'id, type, scope, scopeRefId, updatedAt',
      messages: 'id, sessionId, channelType, channelId, createdAt',
      documents: 'id, ownerUserId, createdAt',
      localActions: 'id, entityType, entityId, createdAt, syncStatus',
      dashboardProfiles: 'id, userId, role, isFavorite, updatedAt'
    });

    this.version(4).stores({
      systems: 'id, ownerUserId, visibility, updatedAt',
      characters: 'id, systemId, ownerUserId, sessionId',
      sessions: 'id, gmUserId, state, updatedAt',
      notes: 'id, type, scope, scopeRefId, updatedAt',
      messages: 'id, sessionId, channelType, channelId, createdAt',
      documents: 'id, ownerUserId, createdAt',
      localActions: 'id, entityType, entityId, createdAt, syncStatus',
      dashboardProfiles: 'id, userId, role, isFavorite, updatedAt'
    });
  }
}

export const db = new NexusForgeDatabase();

let didInit = false;

export async function ensureDatabaseIsInitialized(): Promise<void> {
  if (didInit) {
    return;
  }

  await db.open();

  const sessionsCount = await db.sessions.count();
  if (sessionsCount === 0) {
    await db.sessions.bulkPut(seededSessions);
  }

  const systemsCount = await db.systems.count();
  if (systemsCount === 0) {
    await db.systems.bulkPut(seededSystems);
  }

  const charactersCount = await db.characters.count();
  if (charactersCount === 0) {
    await db.characters.bulkPut(seededCharacters);
  }

  const notesCount = await db.notes.count();
  if (notesCount === 0) {
    await db.notes.bulkPut(seededNotes);
  }

  const documentsCount = await db.documents.count();
  if (documentsCount === 0) {
    await db.documents.bulkPut(seededDocuments);
  }

  const messagesCount = await db.messages.count();
  if (messagesCount === 0) {
    await db.messages.bulkPut(seededMessages);
  }

  didInit = true;
}
