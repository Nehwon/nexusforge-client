import { CharacterSheetView, SheetAction, SheetField, SheetGroup } from '../../../types/characterSheet';

type SteamDie = {
  label: string;
  isUsed: boolean;
};

type LeveledLabel = {
  name: string;
  level?: number;
};

const steamDice: SteamDie[] = [
  { label: 'De vapeur A', isUsed: false },
  { label: 'De vapeur B', isUsed: true },
  { label: 'De vapeur C', isUsed: false }
];

const summaryCompetences = ['Infiltration', 'Persuasion', 'Pilotage'];
const summaryTalents: LeveledLabel[] = [
  { name: 'Nerfs d acier', level: 2 },
  { name: 'Tir reflexe', level: 1 },
  { name: 'Analyse rapide' }
];

const groups: SheetGroup[] = [
  { id: 'valeurs_secondaires', label: 'Valeurs secondaires', layout: 'grid' },
  { id: 'reserve_des', label: 'Reserve de des', layout: 'list' },
  { id: 'competences_selectionnees', label: 'Competences selectionnees', layout: 'list' },
  { id: 'talents_selectionnes', label: 'Talents selectionnes', layout: 'list' }
];

const secondaryFields: SheetField[] = [
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
  {
    id: 'fortune',
    label: 'Fortune',
    type: 'resource',
    value: 2,
    max: 5,
    groupId: 'valeurs_secondaires',
    isPrimary: true
  },
  { id: 'argent', label: 'Argent', type: 'number', value: 120, groupId: 'valeurs_secondaires' },
  { id: 'influence', label: 'Influence', type: 'number', value: 3, groupId: 'valeurs_secondaires' },
  { id: 'experience', label: 'Experience', type: 'number', value: 14, groupId: 'valeurs_secondaires' }
];

const reserveFields: SheetField[] = steamDice.map((die, index) => ({
  id: `steam-die-${index + 1}`,
  label: die.label,
  type: 'tag',
  value: die.isUsed ? 'Utilise' : 'Disponible',
  groupId: 'reserve_des'
}));

const competenceFields: SheetField[] = summaryCompetences.map((competence, index) => ({
  id: `competence-${index + 1}`,
  label: competence,
  type: 'tag',
  value: competence,
  groupId: 'competences_selectionnees'
}));

const talentFields: SheetField[] = summaryTalents.map((talent, index) => ({
  id: `talent-${index + 1}`,
  label: `Talent ${index + 1}`,
  type: 'text',
  value: talent.level ? `${talent.name} (Niv. ${talent.level})` : talent.name,
  groupId: 'talents_selectionnes'
}));

const actions: SheetAction[] = [
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
];

export const mockSteamShadowsSheet: CharacterSheetView = {
  id: 'character-steamshadows-1',
  name: 'Aria Volt',
  portraitUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  groups,
  fields: [...secondaryFields, ...reserveFields, ...competenceFields, ...talentFields],
  actions
};

type CharacterWidgetProps = {
  sheet: CharacterSheetView;
};

function renderResourceField(field: SheetField) {
  const value = typeof field.value === 'number' ? field.value : Number(field.value) || 0;
  const max = field.max ?? value;
  const percentage = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return (
    <article key={field.id} className="character-resource">
      <div className="character-resource__meta">
        <strong>{field.label}</strong>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="character-resource__bar">
        <span style={{ width: `${percentage}%` }} />
      </div>
    </article>
  );
}

function renderField(field: SheetField) {
  if (field.type === 'resource') {
    return renderResourceField(field);
  }

  if (field.type === 'number') {
    return (
      <article key={field.id} className="character-number-badge">
        <span>{field.label}</span>
        <strong>{field.value}</strong>
      </article>
    );
  }

  if (field.type === 'tag') {
    return (
      <article key={field.id} className="character-chip">
        <span>{field.label}</span>
        {field.value !== field.label ? <strong>{field.value}</strong> : null}
      </article>
    );
  }

  return (
    <article key={field.id} className="character-text">
      <strong>{field.label}</strong>
      <p>{field.value}</p>
    </article>
  );
}

export default function CharacterWidget({ sheet }: CharacterWidgetProps) {
  const primaryFields = sheet.fields.filter((field) => field.isPrimary);

  return (
    <div className="character-widget">
      <header className="character-widget__header">
        {sheet.portraitUrl ? (
          <img src={sheet.portraitUrl} alt={`Portrait de ${sheet.name}`} className="character-widget__portrait" />
        ) : null}
        <div>
          <h3 style={{ margin: 0 }}>{sheet.name}</h3>
          <p style={{ margin: '0.3rem 0 0', color: '#475467' }}>SteamShadows - Fiche multi-systeme</p>
        </div>
      </header>

      {primaryFields.length > 0 ? (
        <section className="character-widget__summary">
          <h4 style={{ margin: 0 }}>Resume</h4>
          <div className="character-widget__summary-grid">{primaryFields.map((field) => renderField(field))}</div>
        </section>
      ) : null}

      {sheet.groups.map((group) => {
        const groupedFields = sheet.fields.filter((field) => field.groupId === group.id && !field.isPrimary);
        return (
          <section key={group.id} className="character-widget__group">
            <h4 style={{ margin: 0 }}>{group.label}</h4>
            <div className={group.layout === 'list' ? 'character-fields list' : 'character-fields grid'}>
              {groupedFields.map((field) => renderField(field))}
            </div>
          </section>
        );
      })}

      {sheet.actions?.length ? (
        <section className="character-widget__actions">
          <h4 style={{ margin: 0 }}>Actions</h4>
          <div className="character-widget__actions-list">
            {sheet.actions.map((action) => (
              <button
                type="button"
                className="button secondary"
                key={action.id}
                onClick={() => {
                  console.log('Action clicked', action);
                }}
                title={action.description}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
