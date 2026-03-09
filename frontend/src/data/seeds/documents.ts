import { Document } from '../../types/document';

export const seededDocuments: Document[] = [
  {
    id: 'doc-session-1-map',
    type: 'image',
    title: 'Plan de la tour',
    ownerUserId: 'user-gm-1',
    sessionId: 'session-1',
    isPublic: true,
    sharedWithUserIds: ['user-player-1', 'user-player-2'],
    readByUserIds: ['user-player-2'],
    description: 'Handout map de la zone principale.',
    fileUrl: null,
    createdAt: '2026-03-07T16:50:00.000Z'
  },
  {
    id: 'doc-session-1-clue',
    type: 'handout',
    title: 'Message chiffre',
    ownerUserId: 'user-gm-1',
    sessionId: 'session-1',
    isPublic: false,
    sharedWithUserIds: ['user-player-1'],
    readByUserIds: [],
    description: 'Document partage uniquement au Joueur 1.',
    fileUrl: null,
    createdAt: '2026-03-07T17:40:00.000Z'
  }
];
