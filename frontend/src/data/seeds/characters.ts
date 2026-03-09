import { Character } from '../../types/character';

export const seededCharacters: Character[] = [
  {
    id: 'character-1',
    systemId: 'sys-dnd5e-like',
    templateId: 'template-pc',
    sessionId: 'session-1',
    name: 'Aria Volt',
    type: 'pc',
    ownerUserId: 'user-player-1',
    sheet: {
      id: 'character-1',
      name: 'Aria Volt',
      portraitUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
      groups: [
        { id: 'valeurs_secondaires', label: 'Valeurs secondaires', layout: 'grid' },
        { id: 'reserve_des', label: 'Reserve de des', layout: 'list' },
        { id: 'competences_selectionnees', label: 'Competences selectionnees', layout: 'list' },
        { id: 'talents_selectionnes', label: 'Talents selectionnes', layout: 'list' }
      ],
      fields: [
        { id: 'pv', label: 'PV', type: 'resource', value: 18, max: 24, groupId: 'valeurs_secondaires', isPrimary: true },
        {
          id: 'equilibre',
          label: 'Equilibre mental',
          type: 'resource',
          value: 7,
          max: 10,
          groupId: 'valeurs_secondaires',
          isPrimary: true
        },
        { id: 'fortune', label: 'Fortune', type: 'resource', value: 2, max: 5, groupId: 'valeurs_secondaires', isPrimary: true },
        { id: 'argent', label: 'Argent', type: 'number', value: 120, groupId: 'valeurs_secondaires' },
        { id: 'influence', label: 'Influence', type: 'number', value: 3, groupId: 'valeurs_secondaires' },
        { id: 'experience', label: 'Experience', type: 'number', value: 14, groupId: 'valeurs_secondaires' },
        { id: 'steam-die-1', label: 'De vapeur A', type: 'tag', value: 'Disponible', groupId: 'reserve_des' },
        { id: 'steam-die-2', label: 'De vapeur B', type: 'tag', value: 'Utilise', groupId: 'reserve_des' },
        { id: 'steam-die-3', label: 'De vapeur C', type: 'tag', value: 'Disponible', groupId: 'reserve_des' },
        {
          id: 'competence-1',
          label: 'Infiltration',
          type: 'tag',
          value: 'Infiltration',
          groupId: 'competences_selectionnees'
        },
        { id: 'competence-2', label: 'Persuasion', type: 'tag', value: 'Persuasion', groupId: 'competences_selectionnees' },
        { id: 'competence-3', label: 'Pilotage', type: 'tag', value: 'Pilotage', groupId: 'competences_selectionnees' },
        { id: 'talent-1', label: 'Talent 1', type: 'text', value: 'Nerfs d acier (Niv. 2)', groupId: 'talents_selectionnes' },
        { id: 'talent-2', label: 'Talent 2', type: 'text', value: 'Tir reflexe (Niv. 1)', groupId: 'talents_selectionnes' },
        { id: 'talent-3', label: 'Talent 3', type: 'text', value: 'Analyse rapide', groupId: 'talents_selectionnes' }
      ],
      actions: [
        {
          id: 'jet-attaque',
          label: "Jet d'attaque",
          description: 'Resolution attaque melee ou distance',
          rollFormula: '1d20 + attaque'
        },
        {
          id: 'test-sang-froid',
          label: 'Test de Sang-froid',
          description: 'Resister a la panique',
          rollFormula: '1d20 + volonte'
        }
      ]
    }
  },
  {
    id: 'character-2',
    systemId: 'sys-dnd5e-like',
    templateId: 'template-pc',
    sessionId: 'session-1',
    name: 'Karn Vale',
    type: 'pc',
    ownerUserId: 'user-player-2',
    sheet: {
      id: 'character-2',
      name: 'Karn Vale',
      groups: [{ id: 'valeurs_secondaires', label: 'Valeurs secondaires', layout: 'grid' }],
      fields: [
        { id: 'pv', label: 'PV', type: 'resource', value: 20, max: 20, groupId: 'valeurs_secondaires', isPrimary: true },
        { id: 'stamina', label: 'Stamina', type: 'resource', value: 6, max: 8, groupId: 'valeurs_secondaires', isPrimary: true }
      ]
    }
  }
];
