export interface Character {
  id: string;
  systemId: string;
  templateId: string;
  name: string;
  type?: 'pc' | 'npc' | 'monster' | 'other';
  ownerUserId?: string | null;
  attributes?: Record<string, number | string | boolean | null>;
}
