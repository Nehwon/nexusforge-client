import { GameSystem } from '../../types/system';

export const seededSystems: GameSystem[] = [
  {
    id: 'sys-dnd5e-like',
    name: 'SteamShadows Core',
    version: '0.1.0',
    author: 'Nexus Forge',
    tags: ['fantasy', 'd20'],
    rollDefinitions: [
      {
        id: 'roll-attack',
        label: "Jet d'attaque",
        formula: '1d20 + 5',
        description: 'Attaque standard'
      },
      {
        id: 'roll-will',
        label: 'Test de Sang-froid',
        formula: '1d20 + 2',
        description: 'Resistance mentale'
      }
    ],
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-07T18:00:00.000Z'
  },
  {
    id: 'sys-cyberpunk-like',
    name: 'Neon Ops',
    version: '0.1.0',
    author: 'Nexus Forge',
    tags: ['cyberpunk', 'd10'],
    rollDefinitions: [
      {
        id: 'roll-hack',
        label: 'Test de piratage',
        formula: '1d10 + 4',
        description: 'Intrusion reseau'
      }
    ],
    createdAt: '2026-03-03T20:00:00.000Z',
    updatedAt: '2026-03-06T12:30:00.000Z'
  }
];
