import { GameSystem } from '../../types/system';
import { CharacterSheetView } from '../../types/characterSheet';

const arcanumHorrorCatalog: Array<{ circle: number; parasiteType: string; names: string[] }> = [
  {
    circle: 1,
    parasiteType: 'Sentiments',
    names: ['Poltergeist', 'Anaon', 'Fetcher', 'Eidolor', 'Ardent', 'Spectre', 'Boneless', 'Lemure', 'Revenant', 'Liderc', 'Nocturnae', 'Melusine', 'Wink']
  },
  {
    circle: 2,
    parasiteType: 'Sang',
    names: ['Draugr', 'Huldre', 'Manducateur', 'Simulacre', 'Malmort', 'Vrykolakas', 'Stregas', 'Opyr', 'Kamikire', 'Egregor ou Kasumi']
  },
  {
    circle: 3,
    parasiteType: 'Chair',
    names: ['Tuytu', 'Kivihid', 'Sanguetta', 'Heykel', 'Torz', 'Haire', 'Nasilja', 'Orz']
  },
  {
    circle: 4,
    parasiteType: 'Biomasse',
    names: ['Linvenn', 'Lieju', 'Duinadd', 'Kukac']
  },
  {
    circle: 5,
    parasiteType: 'Pensees',
    names: ['Asrya', 'Modlag', 'Arracht', 'Ljin']
  }
];

function dieForCircle(circle: number): string {
  if (circle === 1) {
    return 'D6';
  }
  if (circle === 2) {
    return 'D8';
  }
  if (circle === 3) {
    return 'D10';
  }
  if (circle === 4) {
    return 'D12';
  }
  return 'D20';
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildArcanumHorrorReferenceSheets(): CharacterSheetView[] {
  const sheets: CharacterSheetView[] = [];

  for (const entry of arcanumHorrorCatalog) {
    const die = dieForCircle(entry.circle);
    for (const horrorName of entry.names) {
      const slug = slugify(horrorName);
      sheets.push({
        id: `template-steamshadows-core-horreur-${slug}`,
        name: `SteamShadows - Horreur - ${horrorName}`,
        groups: [
          { id: 'identite', label: 'Identite de l Horreur', layout: 'grid' },
          { id: 'profil', label: 'Profil de menace', layout: 'grid' },
          { id: 'pouvoirs', label: 'Pouvoirs et signatures', layout: 'list' }
        ],
        fields: [
          { id: 'nom_horreur', label: 'Nom', type: 'text', value: horrorName, groupId: 'identite', isPrimary: true },
          { id: 'cercle', label: 'Cercle', type: 'number', value: entry.circle, groupId: 'identite', isPrimary: true },
          { id: 'de_cercle', label: 'De du Cercle', type: 'tag', value: die, groupId: 'identite', isPrimary: true },
          { id: 'type_parasite', label: 'Type parasite', type: 'tag', value: entry.parasiteType, groupId: 'identite' },
          { id: 'source', label: 'Source', type: 'tag', value: 'Arcanum Horribilis', groupId: 'identite' },
          { id: 'niveau_menace', label: 'Niveau menace', type: 'number', value: entry.circle + 1, groupId: 'profil', isPrimary: true },
          { id: 'pv', label: 'Points de vie', type: 'resource', value: 10 + entry.circle * 2, max: 10 + entry.circle * 2, groupId: 'profil', isPrimary: true },
          { id: 'initiative', label: 'Initiative', type: 'number', value: entry.circle + 1, groupId: 'profil', isPrimary: true },
          { id: 'attaque', label: 'Attaque', type: 'number', value: entry.circle + 1, groupId: 'profil' },
          { id: 'defense', label: 'Defense', type: 'number', value: entry.circle + 1, groupId: 'profil' },
          { id: 'endurance', label: 'Endurance', type: 'number', value: entry.circle + 2, groupId: 'profil' },
          { id: 'ancre_psychique', label: 'Ancre psychique', type: 'text', value: 'A definir par le MJ', groupId: 'pouvoirs' },
          { id: 'signature', label: 'Signature', type: 'text', value: 'A definir par le MJ', groupId: 'pouvoirs' },
          { id: 'pouvoirs_speciaux', label: 'Pouvoirs', type: 'text', value: 'A definir par le MJ', groupId: 'pouvoirs' },
          { id: 'conditions_destruction', label: 'Conditions destruction', type: 'text', value: 'A definir par le MJ', groupId: 'pouvoirs' }
        ],
        actions: [
          { id: `ss-horreur-${slug}-attaque`, label: `Attaque (${die})`, rollFormula: `1d${die.slice(1)} + attaque` },
          { id: `ss-horreur-${slug}-initiative`, label: `Initiative (${die})`, rollFormula: `1d${die.slice(1)} + initiative` }
        ]
      });
    }
  }

  return sheets;
}

export const seededSystems: GameSystem[] = [
  {
    id: 'sys-dnd5e-like',
    name: 'SteamShadows Core',
    version: '0.1.0',
    author: 'Nexus Forge',
    ownerUserId: 'user-gm-1',
    visibility: 'public',
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
    rulesProgram: [
      {
        id: 'rule-defense',
        type: 'set_secondary_stat',
        label: 'Defense',
        targetFieldId: 'influence',
        sourceFieldIds: ['fortune', 'equilibre'],
        operation: 'sum',
        constantModifier: 1,
        rounding: 'round'
      },
      {
        id: 'rule-roll-attack',
        type: 'define_roll',
        actionId: 'jet-attaque-visuel',
        label: "Jet d'attaque (visuel)",
        description: 'Jet parametre via bloc',
        diceCount: 1,
        diceSides: 20,
        modifierFieldId: 'influence',
        flatModifier: 0
      }
    ],
    referenceSheets: [
      {
        id: 'template-steamshadows-pc',
        name: 'Template Aventurier SteamShadows',
        groups: [
          { id: 'valeurs_secondaires', label: 'Valeurs secondaires', layout: 'grid' },
          { id: 'competences_selectionnees', label: 'Competences', layout: 'list' }
        ],
        fields: [
          { id: 'pv', label: 'PV', type: 'resource', value: 20, max: 20, groupId: 'valeurs_secondaires', isPrimary: true },
          {
            id: 'equilibre',
            label: 'Equilibre mental',
            type: 'resource',
            value: 8,
            max: 10,
            groupId: 'valeurs_secondaires',
            isPrimary: true
          },
          { id: 'fortune', label: 'Fortune', type: 'resource', value: 2, max: 5, groupId: 'valeurs_secondaires', isPrimary: true },
          { id: 'influence', label: 'Influence', type: 'number', value: 0, groupId: 'valeurs_secondaires' },
          { id: 'competence-1', label: 'Competence 1', type: 'tag', value: 'A choisir', groupId: 'competences_selectionnees' }
        ],
        actions: [
          {
            id: 'jet-attaque',
            label: "Jet d'attaque",
            description: 'Action de base',
            rollFormula: '1d20 + influence'
          }
        ]
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
    ownerUserId: 'user-gm-2',
    visibility: 'public',
    tags: ['cyberpunk', 'd10'],
    rollDefinitions: [
      {
        id: 'roll-hack',
        label: 'Test de piratage',
        formula: '1d10 + 4',
        description: 'Intrusion reseau'
      }
    ],
    rulesProgram: [],
    referenceSheets: [
      {
        id: 'template-neonops-runner',
        name: 'Template Runner Neon Ops',
        groups: [{ id: 'core', label: 'Core', layout: 'grid' }],
        fields: [
          { id: 'hp', label: 'HP', type: 'resource', value: 12, max: 12, groupId: 'core', isPrimary: true },
          { id: 'focus', label: 'Focus', type: 'resource', value: 6, max: 6, groupId: 'core', isPrimary: true },
          { id: 'hack', label: 'Hack', type: 'number', value: 4, groupId: 'core' }
        ],
        actions: [
          {
            id: 'hack-roll',
            label: 'Hack',
            rollFormula: '1d10 + hack'
          }
        ]
      }
    ],
    createdAt: '2026-03-03T20:00:00.000Z',
    updatedAt: '2026-03-06T12:30:00.000Z'
  },
  {
    id: 'sys-steamshadows-reference',
    name: 'SteamShadows Core',
    version: '1.0.0',
    author: 'Nexus Forge',
    ownerUserId: 'user-gm-1',
    visibility: 'public',
    tags: ['steampunk', 'steamshadows', 'd20', 'core'],
    rulesProgram: [
      {
        id: 'ss-rule-vitalite',
        type: 'set_secondary_stat',
        label: 'Vitalite',
        targetFieldId: 'vitalite',
        sourceFieldIds: ['endurance', 'force'],
        operation: 'sum',
        constantModifier: 2,
        rounding: 'round'
      },
      {
        id: 'ss-rule-sang-froid',
        type: 'set_secondary_stat',
        label: 'Sang-froid',
        targetFieldId: 'sang_froid',
        sourceFieldIds: ['volonte', 'intuition'],
        operation: 'average',
        constantModifier: 0,
        rounding: 'round'
      },
      {
        id: 'ss-rule-initiative',
        type: 'set_secondary_stat',
        label: 'Initiative',
        targetFieldId: 'initiative',
        sourceFieldIds: ['vitesse', 'perception'],
        operation: 'average',
        constantModifier: 0,
        rounding: 'round'
      },
      {
        id: 'ss-roll-attaque-feu',
        type: 'define_roll',
        actionId: 'ss-attaque-feu',
        label: 'Attaque (armes a feu)',
        description: 'Jet d attaque standard',
        diceCount: 1,
        diceSides: 20,
        modifierFieldId: 'comp_armes_a_feu',
        flatModifier: 0
      },
      {
        id: 'ss-roll-perception',
        type: 'define_roll',
        actionId: 'ss-perception',
        label: 'Test de perception',
        description: 'Detection et vigilance',
        diceCount: 1,
        diceSides: 20,
        modifierFieldId: 'perception',
        flatModifier: 0
      }
    ],
    referenceSheets: [
      {
        id: 'template-steamshadows-core-pj',
        name: 'SteamShadows - PJ',
        groups: [
          { id: 'secondaires', label: 'Valeurs secondaires', layout: 'grid' },
          { id: 'physiques', label: 'Caracteristiques physiques', layout: 'grid' },
          { id: 'mentales', label: 'Caracteristiques mentales', layout: 'grid' },
          { id: 'esoteriques', label: 'Caracteristiques esoteriques', layout: 'grid' },
          { id: 'competences', label: 'Competences selectionnees', layout: 'list' },
          { id: 'talents', label: 'Talents et traits', layout: 'list' }
        ],
        fields: [
          { id: 'pv', label: 'Points de vie', type: 'resource', value: 16, max: 24, groupId: 'secondaires', isPrimary: true },
          { id: 'vitalite', label: 'Vitalite', type: 'number', value: 0, groupId: 'secondaires', isPrimary: true },
          { id: 'sang_froid', label: 'Sang-froid', type: 'number', value: 0, groupId: 'secondaires', isPrimary: true },
          { id: 'initiative', label: 'Initiative', type: 'number', value: 0, groupId: 'secondaires', isPrimary: true },

          { id: 'perception', label: 'Perception', type: 'number', value: 3, groupId: 'physiques' },
          { id: 'vitesse', label: 'Vitesse', type: 'number', value: 3, groupId: 'physiques' },
          { id: 'endurance', label: 'Endurance', type: 'number', value: 3, groupId: 'physiques' },
          { id: 'dexterite', label: 'Dexterite', type: 'number', value: 3, groupId: 'physiques' },
          { id: 'force', label: 'Force', type: 'number', value: 3, groupId: 'physiques' },

          { id: 'savoir', label: 'Savoir', type: 'number', value: 3, groupId: 'mentales' },
          { id: 'logique', label: 'Logique', type: 'number', value: 3, groupId: 'mentales' },
          { id: 'volonte', label: 'Volonte', type: 'number', value: 3, groupId: 'mentales' },
          { id: 'empathie', label: 'Empathie', type: 'number', value: 3, groupId: 'mentales' },
          { id: 'intuition', label: 'Intuition', type: 'number', value: 3, groupId: 'mentales' },

          { id: 'sagesse', label: 'Sagesse', type: 'number', value: 2, groupId: 'esoteriques' },
          { id: 'fusion', label: 'Fusion', type: 'number', value: 2, groupId: 'esoteriques' },
          { id: 'resistance', label: 'Resistance', type: 'number', value: 2, groupId: 'esoteriques' },
          { id: 'impulsion', label: 'Impulsion', type: 'number', value: 2, groupId: 'esoteriques' },
          { id: 'conscience', label: 'Conscience', type: 'number', value: 2, groupId: 'esoteriques' },

          { id: 'comp_armes_a_feu', label: 'Armes a feu', type: 'number', value: 2, groupId: 'competences' },
          { id: 'comp_esquive', label: 'Esquive', type: 'number', value: 2, groupId: 'competences' },
          { id: 'comp_mecanique', label: 'Mecanique', type: 'number', value: 1, groupId: 'competences' },
          { id: 'trait-1', label: 'Trait 1', type: 'text', value: 'Nerfs d acier', groupId: 'talents' },
          { id: 'trait-2', label: 'Trait 2', type: 'text', value: 'Ingenieur de terrain', groupId: 'talents' }
        ],
        actions: [
          { id: 'ss-action-attaque', label: 'Attaque', rollFormula: '1d20 + comp_armes_a_feu' },
          { id: 'ss-action-esquive', label: 'Esquive', rollFormula: '1d20 + comp_esquive' },
          { id: 'ss-action-volonte', label: 'Volonte', rollFormula: '1d20 + volonte' }
        ]
      },
      {
        id: 'template-steamshadows-core-pnj',
        name: 'SteamShadows - PNJ',
        groups: [
          { id: 'secondaires', label: 'Valeurs secondaires', layout: 'grid' },
          { id: 'profil', label: 'Profil PNJ', layout: 'grid' },
          { id: 'notes', label: 'Notes MJ', layout: 'list' }
        ],
        fields: [
          { id: 'pv', label: 'Points de vie', type: 'resource', value: 10, max: 14, groupId: 'secondaires', isPrimary: true },
          { id: 'vitalite', label: 'Vitalite', type: 'number', value: 0, groupId: 'secondaires', isPrimary: true },
          { id: 'initiative', label: 'Initiative', type: 'number', value: 0, groupId: 'secondaires', isPrimary: true },
          { id: 'perception', label: 'Perception', type: 'number', value: 2, groupId: 'profil' },
          { id: 'vitesse', label: 'Vitesse', type: 'number', value: 2, groupId: 'profil' },
          { id: 'endurance', label: 'Endurance', type: 'number', value: 2, groupId: 'profil' },
          { id: 'force', label: 'Force', type: 'number', value: 2, groupId: 'profil' },
          { id: 'comp_corps_a_corps', label: 'Corps a corps', type: 'number', value: 2, groupId: 'profil' },
          { id: 'comp_tir', label: 'Tir', type: 'number', value: 1, groupId: 'profil' },
          { id: 'note-role', label: 'Role narratif', type: 'text', value: 'Garde de faction', groupId: 'notes' }
        ],
        actions: [
          { id: 'ss-pnj-action-corpsacorps', label: 'Attaque melee', rollFormula: '1d20 + comp_corps_a_corps' },
          { id: 'ss-pnj-action-tir', label: 'Tir', rollFormula: '1d20 + comp_tir' }
        ]
      },
      {
        id: 'template-steamshadows-core-creature',
        name: 'SteamShadows - Creature',
        groups: [
          { id: 'secondaires', label: 'Valeurs secondaires', layout: 'grid' },
          { id: 'instincts', label: 'Instincts', layout: 'grid' },
          { id: 'specifiques', label: 'Capacites specifiques', layout: 'list' }
        ],
        fields: [
          { id: 'pv', label: 'Points de vie', type: 'resource', value: 18, max: 18, groupId: 'secondaires', isPrimary: true },
          { id: 'vitalite', label: 'Vitalite', type: 'number', value: 0, groupId: 'secondaires', isPrimary: true },
          { id: 'initiative', label: 'Initiative', type: 'number', value: 0, groupId: 'secondaires', isPrimary: true },
          { id: 'perception', label: 'Perception', type: 'number', value: 4, groupId: 'instincts' },
          { id: 'vitesse', label: 'Vitesse', type: 'number', value: 4, groupId: 'instincts' },
          { id: 'endurance', label: 'Endurance', type: 'number', value: 4, groupId: 'instincts' },
          { id: 'force', label: 'Force', type: 'number', value: 5, groupId: 'instincts' },
          { id: 'comp_morsure', label: 'Morsure', type: 'number', value: 4, groupId: 'instincts' },
          { id: 'capacite-1', label: 'Capacite 1', type: 'text', value: 'Peur mecanique', groupId: 'specifiques' },
          { id: 'capacite-2', label: 'Capacite 2', type: 'text', value: 'Charge brutale', groupId: 'specifiques' }
        ],
        actions: [
          { id: 'ss-creature-action-morsure', label: 'Morsure', rollFormula: '1d20 + comp_morsure' },
          { id: 'ss-creature-action-charge', label: 'Charge', rollFormula: '1d20 + force' }
        ]
      },
      {
        id: 'template-steamshadows-core-horreur-arcanum',
        name: 'SteamShadows - Horreur (Arcanum)',
        groups: [
          { id: 'identite', label: 'Identite de l Horreur', layout: 'grid' },
          { id: 'profil', label: 'Profil de menace', layout: 'grid' },
          { id: 'pouvoirs', label: 'Pouvoirs et signes', layout: 'list' },
          { id: 'catalogue', label: 'Catalogue Arcanum (reference MJ)', layout: 'list' }
        ],
        fields: [
          { id: 'nom_horreur', label: 'Nom', type: 'text', value: 'Poltergeist', groupId: 'identite', isPrimary: true },
          { id: 'cercle', label: 'Cercle', type: 'number', value: 1, groupId: 'identite', isPrimary: true },
          { id: 'de_cercle', label: 'De du Cercle', type: 'tag', value: 'D6', groupId: 'identite', isPrimary: true },
          { id: 'type_parasite', label: 'Type parasite', type: 'tag', value: 'Sentiments / Sang / Chair / Biomasse / Pensees', groupId: 'identite' },
          { id: 'niveau_menace', label: 'Niveau menace', type: 'number', value: 2, groupId: 'profil', isPrimary: true },
          { id: 'pv', label: 'Points de vie', type: 'resource', value: 12, max: 12, groupId: 'profil', isPrimary: true },
          { id: 'initiative', label: 'Initiative', type: 'number', value: 2, groupId: 'profil', isPrimary: true },
          { id: 'attaque', label: 'Attaque', type: 'number', value: 2, groupId: 'profil' },
          { id: 'defense', label: 'Defense', type: 'number', value: 2, groupId: 'profil' },
          { id: 'endurance', label: 'Endurance', type: 'number', value: 3, groupId: 'profil' },
          { id: 'ancre_psychique', label: 'Ancre psychique', type: 'text', value: 'Objet lie au defunt / source de fixation', groupId: 'pouvoirs' },
          { id: 'signature', label: 'Signature', type: 'text', value: 'Manifestation typique et motifs de chasse', groupId: 'pouvoirs' },
          { id: 'pouvoirs_speciaux', label: 'Pouvoirs', type: 'text', value: 'Intangibilite, mimetisme, contamination, etc.', groupId: 'pouvoirs' },
          { id: 'conditions_destruction', label: 'Conditions destruction', type: 'text', value: 'Rituel, ancre, vulnerabilite specifique', groupId: 'pouvoirs' },
          {
            id: 'catalogue_cercle_1',
            label: 'Cercle I',
            type: 'text',
            value: 'Poltergeist, Anaon, Fetcher, Eidolor, Ardent, Spectre, Boneless, Lemure, Revenant, Liderc, Nocturnae, Melusine, Wink',
            groupId: 'catalogue'
          },
          {
            id: 'catalogue_cercle_2',
            label: 'Cercle II',
            type: 'text',
            value: 'Draugr, Huldre, Manducateur, Simulacre, Malmort, Vrykolakas, Stregas, Opyr, Kamikire, Egregor/Kasumi',
            groupId: 'catalogue'
          },
          {
            id: 'catalogue_cercle_3',
            label: 'Cercle III',
            type: 'text',
            value: 'Tuytu, Kivihid, Sanguetta, Heykel, Torz, Haire, Nasilja, Orz',
            groupId: 'catalogue'
          },
          {
            id: 'catalogue_cercle_4',
            label: 'Cercle IV',
            type: 'text',
            value: 'Linvenn, Lieju, Duinadd, Kukac',
            groupId: 'catalogue'
          },
          {
            id: 'catalogue_cercle_5',
            label: 'Cercle V',
            type: 'text',
            value: 'Asrya, Modlag, Arracht, Ljin',
            groupId: 'catalogue'
          },
          {
            id: 'regle_des_cercles',
            label: 'Regle des des',
            type: 'text',
            value: 'Cercle I->D6, II->D8, III->D10, IV->D12, V->D20',
            groupId: 'catalogue'
          }
        ],
        actions: [
          { id: 'ss-horreur-roll-c1', label: 'Jet Cercle I (D6)', rollFormula: '1d6 + attaque' },
          { id: 'ss-horreur-roll-c2', label: 'Jet Cercle II (D8)', rollFormula: '1d8 + attaque' },
          { id: 'ss-horreur-roll-c3', label: 'Jet Cercle III (D10)', rollFormula: '1d10 + attaque' },
          { id: 'ss-horreur-roll-c4', label: 'Jet Cercle IV (D12)', rollFormula: '1d12 + attaque' },
          { id: 'ss-horreur-roll-c5', label: 'Jet Cercle V (D20)', rollFormula: '1d20 + attaque' }
        ]
      },
      ...buildArcanumHorrorReferenceSheets()
    ],
    createdAt: '2026-03-09T17:30:00.000Z',
    updatedAt: '2026-03-09T17:30:00.000Z'
  }
];
