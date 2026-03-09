import { Message } from '../../types/message';

export const seededMessages: Message[] = [
  {
    id: 'session-1-message-1',
    sessionId: 'session-1',
    channelId: 'session-1-channel-global',
    channelType: 'global',
    fromUserId: 'user-gm-1',
    content: 'Bienvenue a la table, debut de session dans 5 minutes.',
    createdAt: '2026-03-08T18:55:00.000Z'
  },
  {
    id: 'session-1-message-2',
    sessionId: 'session-1',
    channelId: 'session-1-channel-global',
    channelType: 'global',
    fromUserId: 'user-player-1',
    content: 'Pret, j ai ma fiche et mes des.',
    createdAt: '2026-03-08T18:56:00.000Z'
  },
  {
    id: 'session-1-message-3',
    sessionId: 'session-1',
    channelId: 'session-1-channel-group-a',
    channelType: 'group',
    fromUserId: 'user-gm-1',
    groupId: 'session-1-channel-group-a',
    content: 'Groupe A, vous commencez au marche noir.',
    createdAt: '2026-03-08T18:57:00.000Z'
  },
  {
    id: 'session-1-message-4',
    sessionId: 'session-1',
    channelId: 'session-1-channel-direct-player-1-player-2',
    channelType: 'direct',
    fromUserId: 'user-player-2',
    toUserIds: ['user-player-1'],
    content: 'On couvre la sortie nord ?',
    createdAt: '2026-03-08T18:58:00.000Z'
  },
  {
    id: 'session-1-message-5',
    sessionId: 'session-1',
    channelId: 'session-1-channel-direct-gm-player-1',
    channelType: 'direct',
    fromUserId: 'user-player-1',
    toUserIds: ['user-gm-1'],
    content: 'Whisper MJ: je veux fouiller la salle discretement.',
    createdAt: '2026-03-08T18:59:00.000Z',
    isPrivateToGM: true,
    ui: {
      shouldShowBanner: true,
      importance: 'high'
    }
  }
];
