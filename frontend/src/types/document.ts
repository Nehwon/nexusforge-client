export type DocumentType = 'image' | 'pdf' | 'text' | 'handout' | 'characterLink' | 'itemLink' | 'other';

export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  ownerUserId: string;
  createdAt: string;
  description?: string;
  fileUrl?: string | null;
}
