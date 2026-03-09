export type NoteType = 'player_private' | 'gm_private' | 'public';

export interface Note {
  id: string;
  scope: 'campaign' | 'session' | 'character' | 'npc' | 'location' | 'item' | 'other';
  scopeRefId?: string | null;
  sessionId?: string | null;
  type: NoteType;
  title?: string;
  content: string;
  createdByUserId: string;
  ownerUserId?: string | null;
  visibleToUserIds?: string[];
  createdAt: string;
  updatedAt?: string | null;
}
