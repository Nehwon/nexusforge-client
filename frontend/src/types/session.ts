export type SessionState = 'planned' | 'running' | 'paused' | 'finished';

export interface SessionSettings {
  allowPlayerToEditCharacterOffline?: boolean;
  allowPlayerToPlayerChat?: boolean;
  allowPlayerToPlayerDocuments?: boolean;
  silenceMode?: 'off' | 'noGlobal' | 'playersToPlayersBlocked' | 'full';
}

export interface SessionParticipant {
  userId: string;
  role: 'gm' | 'player' | 'observer';
  characterId?: string | null;
  isConnected?: boolean;
  lastSeenAt?: string | null;
}

export interface SessionInitiativeEntry {
  id: string;
  type: 'character' | 'group' | 'other';
  name: string;
  initiative: number;
  characterId?: string | null;
  isActive?: boolean;
}

export interface SessionInitiativeState {
  round: number;
  turnIndex: number;
  isInCombat: boolean;
  entries: SessionInitiativeEntry[];
}

export interface Session {
  id: string;
  systemId: string;
  campaignId?: string | null;
  name: string;
  description?: string;
  gmUserId: string;
  state: SessionState;
  settings?: SessionSettings;
  participants?: SessionParticipant[];
  initiative?: SessionInitiativeState;
  createdAt: string;
  updatedAt: string;
}
