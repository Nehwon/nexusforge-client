import { Note } from '../../types/note';

export const seededNotes: Note[] = [
  {
    id: 'note-public-session-1-1',
    scope: 'session',
    scopeRefId: 'session-1',
    sessionId: 'session-1',
    type: 'public',
    title: 'Rappel de scene',
    content: 'Le groupe entre dans la Tour Oubliee par la porte nord.',
    createdByUserId: 'user-gm-1',
    createdAt: '2026-03-07T17:20:00.000Z',
    updatedAt: '2026-03-07T17:20:00.000Z'
  },
  {
    id: 'note-gm-session-1-1',
    scope: 'session',
    scopeRefId: 'session-1',
    sessionId: 'session-1',
    type: 'gm_private',
    title: 'Secret MJ',
    content: 'Le gardien est immunise aux degats de froid.',
    createdByUserId: 'user-gm-1',
    ownerUserId: 'user-gm-1',
    createdAt: '2026-03-07T17:30:00.000Z',
    updatedAt: '2026-03-07T17:30:00.000Z'
  },
  {
    id: 'note-player-session-1-1',
    scope: 'session',
    scopeRefId: 'session-1',
    sessionId: 'session-1',
    type: 'player_private',
    title: 'Piste perso',
    content: 'Verifier la salle de l observatoire apres le combat.',
    createdByUserId: 'user-player-1',
    ownerUserId: 'user-player-1',
    createdAt: '2026-03-07T17:35:00.000Z',
    updatedAt: '2026-03-07T17:35:00.000Z'
  }
];
