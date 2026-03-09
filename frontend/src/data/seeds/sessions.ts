import { Session } from '../../types/session';

export const seededSessions: Session[] = [
  {
    id: 'session-1',
    systemId: 'sys-dnd5e-like',
    name: 'La Tour Oubliee',
    description: 'Exploration et intrigue dans les ruines de Merovia.',
    gmUserId: 'user-gm-1',
    state: 'running',
    settings: {
      allowPlayerToEditCharacterOffline: true,
      allowPlayerToPlayerChat: true,
      allowPlayerToPlayerDocuments: true,
      silenceMode: 'off'
    },
    participants: [
      { userId: 'user-gm-1', role: 'gm', isConnected: true },
      { userId: 'user-player-1', role: 'player', characterId: 'character-1', isConnected: true },
      { userId: 'user-player-2', role: 'player', characterId: 'character-2', isConnected: false }
    ],
    initiative: {
      round: 0,
      turnIndex: 0,
      isInCombat: false,
      entries: [
        { id: 'init-p1', type: 'character', name: 'Joueur Mock', initiative: 16, isActive: true },
        { id: 'init-p2', type: 'character', name: 'Joueur 2', initiative: 13, isActive: true },
        { id: 'init-goblin', type: 'other', name: 'Gardien des ruines', initiative: 11, isActive: true }
      ]
    },
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-07T18:00:00.000Z'
  },
  {
    id: 'session-2',
    systemId: 'sys-cyberpunk-like',
    name: 'Neon Ashes',
    description: 'Operation de recuperation dans les bas-fonds de New Marseille.',
    gmUserId: 'user-gm-2',
    state: 'planned',
    settings: {
      allowPlayerToEditCharacterOffline: true,
      allowPlayerToPlayerChat: false,
      allowPlayerToPlayerDocuments: true,
      silenceMode: 'playersToPlayersBlocked'
    },
    participants: [
      { userId: 'user-gm-2', role: 'gm', isConnected: false },
      { userId: 'user-player-1', role: 'player', characterId: 'character-3', isConnected: false }
    ],
    initiative: {
      round: 0,
      turnIndex: 0,
      isInCombat: false,
      entries: []
    },
    createdAt: '2026-03-03T20:00:00.000Z',
    updatedAt: '2026-03-06T12:30:00.000Z'
  }
];
