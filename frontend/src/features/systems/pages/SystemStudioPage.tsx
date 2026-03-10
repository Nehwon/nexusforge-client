import { DragEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import Button from '../../../components/Button';
import { useAuth } from '../../../hooks/useAuth';
import { canUserEditSystem, systemRepository } from '../../../data/repositories/systemRepository';
import {
  GameSystem,
  StudioComponentDefinition,
  StudioComponentType,
  StudioSchema,
  StudioViewDefinition
} from '../../../types/system';

type RuntimeValue = string | number | boolean | string[] | Array<Record<string, string>>;
type RuntimeValues = Record<string, RuntimeValue>;

type PaletteItem = {
  type: StudioComponentType;
  label: string;
  defaultValue?: string | number | boolean;
  options?: string[];
};

type ButtonScriptTemplate = { id: string; label: string; script: string };

const STUDIO_LEFT_WIDTH_KEY = 'nexusforge.studio.leftWidth';
const STUDIO_RIGHT_WIDTH_KEY = 'nexusforge.studio.rightWidth';
const STUDIO_FULLSCREEN_KEY = 'nexusforge.studio.fullscreen';

const BUTTON_SCRIPT_TEMPLATES: ButtonScriptTemplate[] = [
  {
    id: 'damage-basic',
    label: 'Degats de base',
    script: 'IF @hp > 0\nSET hp = @hp - 1\nENDIF'
  },
  {
    id: 'heal-basic',
    label: 'Soin de base',
    script: 'SET hp = @hp + 1'
  },
  {
    id: 'toggle-state',
    label: 'Basculer etat',
    script: 'TOGGLE etat_alerte'
  },
  {
    id: 'roll-attack',
    label: 'Jet d attaque',
    script: 'ROLL 1d20+@attaque'
  },
  {
    id: 'roll-skill',
    label: 'Jet competence',
    script: 'ROLL 1d20+@competence'
  },
  {
    id: 'if-then-else',
    label: 'Condition IF/ELSE',
    script: "IF @hp <= 0\nSET etat_ko = 1\nELSE\nSET etat_ko = 0\nENDIF"
  },
  {
    id: 'resource-pack',
    label: 'Consommer ressource',
    script: 'IF @mana >= 2\nADD mana -2\nROLL 1d8+@magie\nENDIF'
  },
  {
    id: 'inventory-count',
    label: 'Compteur inventaire',
    script: 'ADD charges -1\nIF @charges <= 0\nSET item_vide = 1\nENDIF'
  }
];

function customTemplateStorageKey(userId: string): string {
  return `nexusforge.customScriptTemplates:${userId}`;
}

const PALETTE_TREE: Array<{ id: string; label: string; items: PaletteItem[] }> = [
  {
    id: 'basic-inputs',
    label: 'Champs de base',
    items: [
      { type: 'text', label: 'Texte', defaultValue: '' },
      { type: 'textarea', label: 'Texte multi-ligne', defaultValue: '' },
      { type: 'number', label: 'Nombre', defaultValue: 0 },
      { type: 'checkbox', label: 'Case a cocher', defaultValue: false },
      { type: 'choice', label: 'Choix (liste)', options: ['Option A', 'Option B'] },
      { type: 'range', label: 'Jauge (range)', defaultValue: 0 }
    ]
  },
  {
    id: 'advanced-inputs',
    label: 'Champs avances',
    items: [
      { type: 'color', label: 'Couleur', defaultValue: '#ffffff' },
      { type: 'date', label: 'Date' },
      { type: 'time', label: 'Heure' },
      { type: 'avatar', label: 'Avatar / image' }
    ]
  },
  {
    id: 'display-actions',
    label: 'Affichage / actions',
    items: [
      { type: 'label', label: 'Label / texte statique', defaultValue: 'Titre de section' },
      { type: 'icon', label: 'Icone' },
      { type: 'button', label: 'Bouton', defaultValue: 'Action' }
    ]
  },
  {
    id: 'layout',
    label: 'Layout / structure',
    items: [
      { type: 'container', label: 'Container / groupe' },
      { type: 'row', label: 'Ligne' },
      { type: 'column', label: 'Colonne' },
      { type: 'tabs', label: 'Onglets', options: ['Vue 1', 'Vue 2'] },
      { type: 'tabs_nested', label: 'Onglets imbriques', options: ['Bloc A', 'Bloc B'] },
      { type: 'view', label: 'Bloc vue' },
      { type: 'repeater', label: 'Liste repetable', options: ['Ligne 1'] }
    ]
  },
  {
    id: 'logic',
    label: 'Logique visuelle',
    items: [
      { type: 'logic_if', label: 'Bloc IF' },
      { type: 'logic_then', label: 'Bloc THEN' },
      { type: 'logic_else', label: 'Bloc ELSE' },
      { type: 'logic_or', label: 'Bloc OR' },
      { type: 'logic_not', label: 'Bloc NOT' }
    ]
  },
  {
    id: 'rpg-specialized',
    label: 'Composants JDR',
    items: [
      { type: 'dice_roll', label: 'Jet de des', defaultValue: '1d20+@mod' },
      { type: 'table', label: 'Tableau', options: ['Nom', 'Valeur'] },
      { type: 'inventory', label: 'Inventaire', options: ['Nom', 'Quantite', 'Poids'] },
      { type: 'relation', label: 'Reference relationnelle' }
    ]
  }
];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSchema(system: GameSystem): StudioSchema {
  if (system.studioSchema?.views?.length) {
    return {
      views: system.studioSchema.views.map((view) => ({
        ...view,
        components: view.components.map((component) => ({ ...component }))
      }))
    };
  }

  return {
    views: [{ id: makeId('view'), name: 'Vue principale', components: [] }]
  };
}

function createComponentFromPalette(item: PaletteItem): StudioComponentDefinition {
  return {
    id: makeId('cmp'),
    type: item.type,
    label: item.label,
    key: `${item.type}_${Math.random().toString(36).slice(2, 6)}`,
    parentId: undefined,
    defaultValue: item.defaultValue,
    placeholder: '',
    options: item.options,
    min: item.type === 'range' ? 0 : undefined,
    max: item.type === 'range' ? 100 : undefined,
    step: item.type === 'range' ? 1 : undefined,
    required: false,
    showIf: '',
    validationPattern: '',
    validationMessage: '',
    columns: item.type === 'table' || item.type === 'inventory' ? item.options ?? ['Nom', 'Valeur'] : undefined,
    diceFormula: item.type === 'dice_roll' ? String(item.defaultValue ?? '1d20') : undefined,
    relationTarget: item.type === 'relation' ? '' : undefined,
    allowMultiple: item.type === 'relation' ? false : undefined,
    actionScript: item.type === 'button' ? '' : undefined,
    reference: '',
    formula: ''
  };
}

const STRUCTURAL_TYPES: StudioComponentType[] = [
  'container',
  'row',
  'column',
  'tabs',
  'tabs_nested',
  'view',
  'repeater',
  'logic_if',
  'logic_then',
  'logic_else',
  'logic_or',
  'logic_not'
];

function isStructuralType(type: StudioComponentType): boolean {
  return STRUCTURAL_TYPES.includes(type);
}

function canContain(parentType: StudioComponentType, childType: StudioComponentType): boolean {
  if (parentType === 'table' || parentType === 'inventory') {
    return childType === 'row';
  }
  if (parentType === 'row') {
    return childType === 'column';
  }
  if (parentType === 'column') {
    return childType !== 'row';
  }
  if (parentType === 'logic_if') {
    return ['logic_then', 'logic_else', 'logic_or', 'logic_not'].includes(childType);
  }
  if (parentType === 'logic_then' || parentType === 'logic_else' || parentType === 'logic_or' || parentType === 'logic_not') {
    return childType !== 'row';
  }
  if (parentType === 'container' || parentType === 'view' || parentType === 'repeater' || parentType === 'tabs' || parentType === 'tabs_nested') {
    return childType !== 'row';
  }
  return false;
}

function buildChildrenMap(components: StudioComponentDefinition[]): Record<string, StudioComponentDefinition[]> {
  return components.reduce<Record<string, StudioComponentDefinition[]>>((acc, component) => {
    if (!component.parentId) {
      return acc;
    }
    if (!acc[component.parentId]) {
      acc[component.parentId] = [];
    }
    acc[component.parentId].push(component);
    return acc;
  }, {});
}

function collectDescendantIds(
  componentId: string,
  childrenByParent: Record<string, StudioComponentDefinition[]>,
  seen = new Set<string>()
): string[] {
  if (seen.has(componentId)) {
    return [];
  }
  seen.add(componentId);
  const children = childrenByParent[componentId] ?? [];
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    ids.push(...collectDescendantIds(child.id, childrenByParent, seen));
  }
  return ids;
}

function getComponentFamily(type: StudioComponentType): 'layout' | 'logic' | 'action' | 'rpg' | 'field' {
  if (['container', 'row', 'column', 'tabs', 'tabs_nested', 'view', 'repeater', 'table', 'inventory'].includes(type)) {
    return 'layout';
  }
  if (['logic_if', 'logic_then', 'logic_else', 'logic_or', 'logic_not'].includes(type)) {
    return 'logic';
  }
  if (['button', 'dice_roll'].includes(type)) {
    return 'action';
  }
  if (['relation', 'avatar'].includes(type)) {
    return 'rpg';
  }
  return 'field';
}

function defaultRuntimeValue(component: StudioComponentDefinition): RuntimeValue {
  if (component.type === 'checkbox') {
    return Boolean(component.defaultValue);
  }
  if (component.type === 'number' || component.type === 'range') {
    return typeof component.defaultValue === 'number' ? component.defaultValue : 0;
  }
  if (component.type === 'choice' || component.type === 'tabs' || component.type === 'tabs_nested') {
    return typeof component.defaultValue === 'string' ? component.defaultValue : component.options?.[0] ?? '';
  }
  if (component.type === 'table' || component.type === 'inventory') {
    return [];
  }
  if (component.type === 'relation') {
    return component.allowMultiple ? [] : '';
  }
  return typeof component.defaultValue === 'string' ? component.defaultValue : '';
}

function buildInitialRuntimeValues(view: StudioViewDefinition | null): RuntimeValues {
  if (!view) {
    return {};
  }
  return view.components.reduce<RuntimeValues>((acc, component) => {
    acc[component.key] = defaultRuntimeValue(component);
    return acc;
  }, {});
}

function toNumber(value: RuntimeValue | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function evaluateMathExpression(expression: string, values: RuntimeValues): number | null {
  const withValues = expression.replace(/@([A-Za-z0-9_]+)/g, (_, key: string) => String(toNumber(values[key])));
  if (!/^[0-9+\-*/().\s]+$/.test(withValues)) {
    return null;
  }
  try {
    const result = new Function(`return (${withValues});`)();
    return typeof result === 'number' && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function applyDerivedFormulas(components: StudioComponentDefinition[], values: RuntimeValues): RuntimeValues {
  let next = { ...values };
  for (let i = 0; i < 4; i += 1) {
    let changed = false;
    for (const component of components) {
      if (!component.formula?.trim()) {
        continue;
      }
      const result = evaluateMathExpression(component.formula.trim(), next);
      if (result === null) {
        continue;
      }
      if (next[component.key] !== result) {
        next[component.key] = result;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return next;
}

function rollDice(formula: string, values: RuntimeValues): { total: number; detail: string } | null {
  const raw = formula.trim().replace(/@([A-Za-z0-9_]+)/g, (_, key: string) => String(toNumber(values[key])));
  const compact = raw.replace(/\s+/g, '');
  const match = compact.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    const fallback = evaluateMathExpression(compact, values);
    if (fallback === null) {
      return null;
    }
    return { total: fallback, detail: compact };
  }

  const diceCount = Math.max(1, Number(match[1] || '1'));
  const diceSides = Math.max(2, Number(match[2]));
  const modifier = Number(match[3] || '0');
  const rolls = Array.from({ length: diceCount }, () => 1 + Math.floor(Math.random() * diceSides));
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  const detail = `${rolls.join(' + ')}${modifier ? ` ${modifier > 0 ? '+' : '-'} ${Math.abs(modifier)}` : ''}`;
  return { total, detail };
}

function evaluateCondition(condition: string, values: RuntimeValues): boolean {
  const withValues = condition.replace(/@([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = values[key];
    if (typeof value === 'string') {
      return JSON.stringify(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return String(value.length);
    }
    return '0';
  });

  if (!/^[A-Za-z0-9_+\-*/%<>=!&|().\s'",]+$/.test(withValues)) {
    return false;
  }

  try {
    return Boolean(new Function(`return (${withValues});`)());
  } catch {
    return false;
  }
}

function validateRuntimeValue(component: StudioComponentDefinition, value: RuntimeValue): string | null {
  if (component.required) {
    if (value === '' || value === null || value === undefined) {
      return component.validationMessage || 'Champ obligatoire.';
    }
    if (Array.isArray(value) && value.length === 0) {
      return component.validationMessage || 'Champ obligatoire.';
    }
  }

  if ((component.type === 'number' || component.type === 'range') && typeof value === 'number') {
    if (typeof component.min === 'number' && value < component.min) {
      return component.validationMessage || `Minimum: ${component.min}`;
    }
    if (typeof component.max === 'number' && value > component.max) {
      return component.validationMessage || `Maximum: ${component.max}`;
    }
  }

  if (component.validationPattern && typeof value === 'string') {
    try {
      const re = new RegExp(component.validationPattern);
      if (!re.test(value)) {
        return component.validationMessage || 'Format invalide.';
      }
    } catch {
      return 'Regex de validation invalide.';
    }
  }

  return null;
}

function executeRuntimeScript(script: string, values: RuntimeValues): { nextValues: RuntimeValues; logs: string[] } {
  const lines = script
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const stack: boolean[] = [];
  let nextValues = { ...values };
  const logs: string[] = [];

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith('IF ')) {
      stack.push(evaluateCondition(line.slice(3).trim(), nextValues));
      continue;
    }
    if (upper === 'ELSE') {
      if (stack.length > 0) {
        stack[stack.length - 1] = !stack[stack.length - 1];
      }
      continue;
    }
    if (upper === 'ENDIF') {
      stack.pop();
      continue;
    }
    if (stack.includes(false)) {
      continue;
    }

    const addMatch = line.match(/^ADD\s+([A-Za-z0-9_]+)\s+(-?\d+(?:\.\d+)?)$/i);
    if (addMatch) {
      const [, target, deltaRaw] = addMatch;
      const delta = Number(deltaRaw);
      nextValues[target] = toNumber(nextValues[target]) + delta;
      logs.push(`add ${target} ${delta > 0 ? '+' : ''}${delta}`);
      continue;
    }

    const setMatch = line.match(/^(?:SET\s+)?([A-Za-z0-9_]+)\s*=\s*(.+)$/i);
    if (setMatch) {
      const [, target, expression] = setMatch;
      const computed = evaluateMathExpression(expression, nextValues);
      if (computed !== null) {
        nextValues[target] = computed;
        logs.push(`set ${target}=${computed}`);
      }
      continue;
    }

    const toggleMatch = line.match(/^TOGGLE\s+([A-Za-z0-9_]+)$/i);
    if (toggleMatch) {
      const [, target] = toggleMatch;
      nextValues[target] = !Boolean(nextValues[target]);
      logs.push(`toggle ${target}`);
      continue;
    }

    const rollMatch = line.match(/^ROLL\s+(.+)$/i);
    if (rollMatch) {
      const [, expression] = rollMatch;
      const roll = rollDice(expression, nextValues);
      if (roll) {
        logs.push(`roll ${expression}=${roll.total} (${roll.detail})`);
      }
    }
  }

  return { nextValues, logs };
}

function renderComponentPreview(component: StudioComponentDefinition): JSX.Element {
  if (component.type === 'logic_if' || component.type === 'logic_then' || component.type === 'logic_else' || component.type === 'logic_or' || component.type === 'logic_not') {
    return <code>{component.formula || component.showIf || 'Bloc logique'}</code>;
  }
  if (component.type === 'checkbox') {
    return (
      <label>
        <input type="checkbox" disabled checked={Boolean(component.defaultValue)} /> {component.label}
      </label>
    );
  }
  if (component.type === 'choice') {
    return (
      <select disabled defaultValue="">
        <option value="">{component.placeholder || 'Choisir'}</option>
        {(component.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (component.type === 'textarea') {
    return <textarea disabled rows={2} placeholder={component.placeholder || component.label} />;
  }
  if (component.type === 'range') {
    return (
      <input
        type="range"
        disabled
        min={component.min ?? 0}
        max={component.max ?? 100}
        step={component.step ?? 1}
        value={typeof component.defaultValue === 'number' ? component.defaultValue : 0}
      />
    );
  }
  if (component.type === 'dice_roll') {
    return <code>{component.diceFormula || component.formula || '1d20'}</code>;
  }
  if (component.type === 'table' || component.type === 'inventory') {
    return <small>{component.type === 'table' ? 'Tableau imbrique: lignes > colonnes > champs' : 'Inventaire imbrique'}</small>;
  }
  if (component.type === 'relation') {
    return <code>ref: {component.relationTarget || 'target'}</code>;
  }
  if (component.type === 'button') {
    return (
      <button className="button secondary" type="button" disabled>
        {String(component.defaultValue || component.label || 'Action')}
      </button>
    );
  }
  return <input type={component.type === 'number' ? 'number' : 'text'} disabled placeholder={component.placeholder || component.label} />;
}

export default function SystemStudioPage() {
  const { currentUser } = useAuth();
  const { systemId } = useParams();
  const studioLayoutRef = useRef<HTMLElement | null>(null);

  const [system, setSystem] = useState<GameSystem | null>(null);
  const [schema, setSchema] = useState<StudioSchema | null>(null);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [selectedComponentId, setSelectedComponentId] = useState('');
  const [dragOverComponentId, setDragOverComponentId] = useState<string | null>(null);
  const [runtimeValues, setRuntimeValues] = useState<RuntimeValues>({});
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [runtimeValidationErrors, setRuntimeValidationErrors] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(290);
  const [rightPanelWidth, setRightPanelWidth] = useState(330);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedButtonTemplateId, setSelectedButtonTemplateId] = useState('');
  const [customButtonTemplates, setCustomButtonTemplates] = useState<ButtonScriptTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [viewerUserIdsDraft, setViewerUserIdsDraft] = useState('');
  const [editorUserIdsDraft, setEditorUserIdsDraft] = useState('');
  const [scriptTestInput, setScriptTestInput] = useState('{}');
  const [scriptTestResult, setScriptTestResult] = useState<string>('');
  const lastSavedSchemaRef = useRef<string>('');

  const canEdit = Boolean(currentUser && system && canUserEditSystem(system, currentUser));

  const selectedView = useMemo(() => {
    if (!schema) {
      return null;
    }
    return schema.views.find((view) => view.id === selectedViewId) ?? schema.views[0] ?? null;
  }, [schema, selectedViewId]);

  const selectedComponent = useMemo(() => {
    if (!selectedView) {
      return null;
    }
    return selectedView.components.find((component) => component.id === selectedComponentId) ?? null;
  }, [selectedComponentId, selectedView]);

  const childrenByParent = useMemo(() => {
    if (!selectedView) {
      return {};
    }
    return buildChildrenMap(selectedView.components);
  }, [selectedView]);

  const rootComponents = useMemo(() => {
    if (!selectedView) {
      return [];
    }
    const existingIds = new Set(selectedView.components.map((component) => component.id));
    return selectedView.components.filter((component) => !component.parentId || !existingIds.has(component.parentId));
  }, [selectedView]);

  const allButtonTemplates = useMemo<ButtonScriptTemplate[]>(
    () => [...BUTTON_SCRIPT_TEMPLATES, ...customButtonTemplates],
    [customButtonTemplates]
  );

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!systemId) {
        setErrorMessage('ID systeme manquant.');
        setIsLoading(false);
        return;
      }
      try {
        const loaded = await systemRepository.getById(systemId);
        if (!loaded) {
          throw new Error('Systeme introuvable.');
        }
        if (!isMounted) {
          return;
        }
        const normalized = ensureSchema(loaded);
        setSystem(loaded);
        setSchema(normalized);
        setViewerUserIdsDraft((loaded.viewerUserIds ?? []).join(', '));
        setEditorUserIdsDraft((loaded.editorUserIds ?? []).join(', '));
        lastSavedSchemaRef.current = JSON.stringify(normalized);
        setIsDirty(false);
        setSelectedViewId(normalized.views[0]?.id ?? '');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Chargement impossible.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [systemId]);

  useEffect(() => {
    const storedLeft = Number(localStorage.getItem(STUDIO_LEFT_WIDTH_KEY) ?? 290);
    const storedRight = Number(localStorage.getItem(STUDIO_RIGHT_WIDTH_KEY) ?? 330);
    const storedFullscreen = localStorage.getItem(STUDIO_FULLSCREEN_KEY);
    if (Number.isFinite(storedLeft) && storedLeft >= 220 && storedLeft <= 520) {
      setLeftPanelWidth(storedLeft);
    }
    if (Number.isFinite(storedRight) && storedRight >= 220 && storedRight <= 520) {
      setRightPanelWidth(storedRight);
    }
    if (storedFullscreen === 'true') {
      setIsFullscreen(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STUDIO_LEFT_WIDTH_KEY, String(leftPanelWidth));
  }, [leftPanelWidth]);

  useEffect(() => {
    localStorage.setItem(STUDIO_RIGHT_WIDTH_KEY, String(rightPanelWidth));
  }, [rightPanelWidth]);

  useEffect(() => {
    localStorage.setItem(STUDIO_FULLSCREEN_KEY, isFullscreen ? 'true' : 'false');
  }, [isFullscreen]);

  useEffect(() => {
    const initial = buildInitialRuntimeValues(selectedView);
    const withDerived = selectedView ? applyDerivedFormulas(selectedView.components, initial) : initial;
    setRuntimeValues(withDerived);
    setRuntimeValidationErrors({});
    setRuntimeMessage(null);
  }, [selectedViewId, selectedView?.components]);

  useEffect(() => {
    setSelectedButtonTemplateId('');
  }, [selectedComponentId]);

  useEffect(() => {
    if (selectedComponent?.type !== 'button') {
      return;
    }
    const script = selectedComponent.actionScript?.trim() || selectedComponent.formula?.trim() || '';
    if (script) {
      setScriptTestResult('');
    }
  }, [selectedComponent?.id, selectedComponent?.type, selectedComponent?.actionScript, selectedComponent?.formula]);

  useEffect(() => {
    if (!currentUser) {
      setCustomButtonTemplates([]);
      return;
    }
    const raw = localStorage.getItem(customTemplateStorageKey(currentUser.id));
    if (!raw) {
      setCustomButtonTemplates([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setCustomButtonTemplates([]);
        return;
      }
      const templates = parsed
        .filter(
          (item): item is ButtonScriptTemplate =>
            item && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.script === 'string'
        )
        .slice(0, 100);
      setCustomButtonTemplates(templates);
    } catch {
      setCustomButtonTemplates([]);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    localStorage.setItem(customTemplateStorageKey(currentUser.id), JSON.stringify(customButtonTemplates));
  }, [currentUser?.id, customButtonTemplates]);

  const updateSchema = (update: (current: StudioSchema) => StudioSchema) => {
    setSchema((current) => {
      if (!current) {
        return current;
      }
      const next = update(current);
      setIsDirty(true);
      return next;
    });
  };

  const updateSelectedView = (update: (view: StudioViewDefinition) => StudioViewDefinition) => {
    if (!selectedView) {
      return;
    }
    updateSchema((current) => ({
      ...current,
      views: current.views.map((view) => (view.id === selectedView.id ? update(view) : view))
    }));
  };

  const updateSelectedComponent = (update: (component: StudioComponentDefinition) => StudioComponentDefinition) => {
    if (!selectedView || !selectedComponent) {
      return;
    }
    updateSelectedView((view) => ({
      ...view,
      components: view.components.map((item) => (item.id === selectedComponent.id ? update(item) : item))
    }));
  };

  const setRuntimeValue = (component: StudioComponentDefinition, value: RuntimeValue) => {
    if (!selectedView) {
      return;
    }
    const validationMessage = validateRuntimeValue(component, value);
    setRuntimeValidationErrors((previous) => {
      const next = { ...previous };
      if (validationMessage) {
        next[component.key] = validationMessage;
      } else {
        delete next[component.key];
      }
      return next;
    });
    const next = applyDerivedFormulas(selectedView.components, {
      ...runtimeValues,
      [component.key]: value
    });
    setRuntimeValues(next);
  };

  const startResizing = (side: 'left' | 'right', event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startLeft = leftPanelWidth;
    const startRight = rightPanelWidth;

    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const containerWidth = studioLayoutRef.current?.clientWidth ?? window.innerWidth;
      const minPanel = 220;
      const maxLeft = Math.max(minPanel, containerWidth - rightPanelWidth - 460);
      const maxRight = Math.max(minPanel, containerWidth - leftPanelWidth - 460);

      if (side === 'left') {
        setLeftPanelWidth(Math.min(Math.max(minPanel, startLeft + deltaX), maxLeft));
      } else {
        setRightPanelWidth(Math.min(Math.max(minPanel, startRight - deltaX), maxRight));
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handlePaletteDragStart = (event: DragEvent<HTMLElement>, item: PaletteItem) => {
    event.dataTransfer.setData('application/nexusforge-palette', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleComponentDragStart = (event: DragEvent<HTMLElement>, componentId: string) => {
    event.dataTransfer.setData('application/nexusforge-component-id', componentId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const insertWithParent = (
    components: StudioComponentDefinition[],
    component: StudioComponentDefinition,
    parentId: string | undefined,
    beforeId?: string
  ): StudioComponentDefinition[] => {
    const next = [...components];
    const item = { ...component, parentId };
    if (beforeId) {
      const beforeIndex = next.findIndex((entry) => entry.id === beforeId);
      if (beforeIndex >= 0) {
        next.splice(beforeIndex, 0, item);
        return next;
      }
    }
    if (parentId) {
      const lastChildIndex = next.reduce((last, entry, index) => (entry.parentId === parentId ? index : last), -1);
      if (lastChildIndex >= 0) {
        next.splice(lastChildIndex + 1, 0, item);
        return next;
      }
      const parentIndex = next.findIndex((entry) => entry.id === parentId);
      if (parentIndex >= 0) {
        next.splice(parentIndex + 1, 0, item);
        return next;
      }
    }
    next.push(item);
    return next;
  };

  const moveComponent = (sourceId: string, targetId: string) => {
    if (!selectedView || sourceId === targetId) {
      return;
    }

    const components = [...selectedView.components];
    const source = components.find((item) => item.id === sourceId);
    const target = components.find((item) => item.id === targetId);
    if (!source || !target) {
      return;
    }

    const childrenMap = buildChildrenMap(components);
    const descendants = new Set(collectDescendantIds(sourceId, childrenMap));
    if (descendants.has(targetId)) {
      return;
    }

    const targetAccepts = canContain(target.type, source.type);
    const nextParentId = targetAccepts ? target.id : target.parentId;

    const sourceChildrenIds = new Set([sourceId, ...collectDescendantIds(sourceId, childrenMap)]);
    const extracted = components.filter((entry) => sourceChildrenIds.has(entry.id));
    const rest = components.filter((entry) => !sourceChildrenIds.has(entry.id));
    const movedRoot = extracted.find((entry) => entry.id === sourceId);
    if (!movedRoot) {
      return;
    }
    const movedDescendants = extracted.filter((entry) => entry.id !== sourceId);
    const moved = { ...movedRoot, parentId: nextParentId };

    let merged = [...rest];
    if (targetAccepts) {
      merged = insertWithParent(merged, moved, nextParentId);
    } else {
      merged = insertWithParent(merged, moved, nextParentId, target.id);
    }
    const parentIndex = merged.findIndex((entry) => entry.id === moved.id);
    if (parentIndex < 0) {
      return;
    }
    merged.splice(parentIndex + 1, 0, ...movedDescendants);

    updateSelectedView((view) => ({ ...view, components: merged }));
  };

  const createComponentWithDefaultChildren = (item: PaletteItem): StudioComponentDefinition[] => {
    const created = createComponentFromPalette(item);
    if (item.type === 'table' || item.type === 'inventory') {
      const row = createComponentFromPalette({ type: 'row', label: 'Ligne', defaultValue: '' });
      row.parentId = created.id;
      const column = createComponentFromPalette({ type: 'column', label: 'Colonne', defaultValue: '' });
      column.parentId = row.id;
      return [created, row, column];
    }
    return [created];
  };

  const handleCanvasDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!canEdit || !selectedView) {
      return;
    }

    const paletteRaw = event.dataTransfer.getData('application/nexusforge-palette');
    if (paletteRaw) {
      try {
        const item = JSON.parse(paletteRaw) as PaletteItem;
        const created = createComponentWithDefaultChildren(item);
        updateSelectedView((view) => ({ ...view, components: [...view.components, ...created] }));
        setSelectedComponentId(created[0].id);
      } catch {
        setErrorMessage('Composant palette invalide.');
      }
      return;
    }

    const sourceComponentId = event.dataTransfer.getData('application/nexusforge-component-id');
    if (sourceComponentId && selectedView.components.some((item) => item.id === sourceComponentId)) {
      updateSelectedView((view) => {
        const components = [...view.components];
        const sourceIndex = components.findIndex((item) => item.id === sourceComponentId);
        if (sourceIndex < 0) {
          return view;
        }
        const [moved] = components.splice(sourceIndex, 1);
        components.push({ ...moved, parentId: undefined });
        return { ...view, components };
      });
    }
  };

  const handleComponentDrop = (event: DragEvent<HTMLElement>, targetComponentId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverComponentId(null);
    if (!canEdit || !selectedView) {
      return;
    }

    const sourceComponentId = event.dataTransfer.getData('application/nexusforge-component-id');
    if (sourceComponentId) {
      moveComponent(sourceComponentId, targetComponentId);
      return;
    }

    const paletteRaw = event.dataTransfer.getData('application/nexusforge-palette');
    if (!paletteRaw) {
      return;
    }

    try {
      const item = JSON.parse(paletteRaw) as PaletteItem;
      const target = selectedView.components.find((component) => component.id === targetComponentId);
      const created = createComponentWithDefaultChildren(item);
      if (!target) {
        updateSelectedView((view) => ({ ...view, components: [...view.components, ...created] }));
        setSelectedComponentId(created[0].id);
        return;
      }
      const acceptedAsChild = canContain(target.type, created[0].type);
      const parentId = acceptedAsChild ? target.id : target.parentId;
      created[0].parentId = parentId;
      if (created.length > 1) {
        const maybeRow = created[1];
        if (maybeRow) {
          maybeRow.parentId = created[0].id;
        }
      }
      if (created.length > 2) {
        const maybeColumn = created[2];
        if (maybeColumn) {
          maybeColumn.parentId = created[1].id;
        }
      }
      updateSelectedView((view) => {
        const components = insertWithParent([...view.components], created[0], parentId, acceptedAsChild ? undefined : target.id);
        const parentIndex = components.findIndex((component) => component.id === created[0].id);
        components.splice(parentIndex + 1, 0, ...created.slice(1));
        return { ...view, components };
      });
      setSelectedComponentId(created[0].id);
    } catch {
      setErrorMessage('Composant palette invalide.');
    }
  };

  const addView = () => {
    if (!canEdit || !schema) {
      return;
    }
    const view: StudioViewDefinition = { id: makeId('view'), name: `Vue ${schema.views.length + 1}`, components: [] };
    setSchema({ ...schema, views: [...schema.views, view] });
    setIsDirty(true);
    setSelectedViewId(view.id);
    setSelectedComponentId('');
  };

  const removeSelectedView = () => {
    if (!canEdit || !schema || !selectedView || schema.views.length <= 1) {
      return;
    }
    const nextViews = schema.views.filter((view) => view.id !== selectedView.id);
    setSchema({ ...schema, views: nextViews });
    setIsDirty(true);
    setSelectedViewId(nextViews[0]?.id ?? '');
    setSelectedComponentId('');
  };

  const deleteSelectedComponent = () => {
    if (!canEdit || !selectedView || !selectedComponent) {
      return;
    }
    const childrenMap = buildChildrenMap(selectedView.components);
    const idsToDelete = new Set([selectedComponent.id, ...collectDescendantIds(selectedComponent.id, childrenMap)]);
    updateSelectedView((view) => ({ ...view, components: view.components.filter((item) => !idsToDelete.has(item.id)) }));
    setSelectedComponentId('');
  };

  const saveStudio = async (options?: { auto?: boolean }) => {
    if (!currentUser || !system || !schema || !canEdit) {
      return;
    }
    setErrorMessage(null);
    if (!options?.auto) {
      setStatusMessage(null);
    }
    setIsSaving(true);
    try {
      const parseUserIds = (raw: string): string[] =>
        raw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      const viewerUserIds = parseUserIds(viewerUserIdsDraft);
      const editorUserIds = parseUserIds(editorUserIdsDraft);
      const nextSystem: GameSystem = { ...system, studioSchema: schema };
      nextSystem.viewerUserIds = viewerUserIds;
      nextSystem.editorUserIds = editorUserIds;
      await systemRepository.upsert(nextSystem, currentUser);
      setSystem(nextSystem);
      lastSavedSchemaRef.current = JSON.stringify(schema);
      setIsDirty(false);
      setStatusMessage(options?.auto ? 'Sauvegarde auto effectuee.' : 'Studio sauvegarde.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sauvegarde impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!canEdit) {
      return;
    }
    const intervalId = window.setInterval(() => {
      if (!schema || isSaving || !isDirty) {
        return;
      }
      const currentSnapshot = JSON.stringify(schema);
      if (currentSnapshot === lastSavedSchemaRef.current) {
        setIsDirty(false);
        return;
      }
      void saveStudio({ auto: true });
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [canEdit, isDirty, isSaving, schema, currentUser, system]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveStudio();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const layoutStyle =
    typeof window !== 'undefined' && window.innerWidth > 900
      ? { gridTemplateColumns: `${leftPanelWidth}px 8px minmax(420px, 1fr) 8px ${rightPanelWidth}px` }
      : undefined;

  const relationTargets =
    selectedView?.components.filter((component) => !isStructuralType(component.type)).map((component) => component.key) ?? [];
  const visibleRuntimeComponents =
    selectedView?.components.filter((component) => {
      if (isStructuralType(component.type)) {
        return false;
      }
      if (!component.showIf?.trim()) {
        return true;
      }
      return evaluateCondition(component.showIf, runtimeValues);
    }) ?? [];

  const runButtonScript = (component: StudioComponentDefinition) => {
    const script = component.actionScript?.trim() || component.formula?.trim() || '';
    if (!script) {
      setRuntimeMessage('Aucun script defini pour ce bouton.');
      return;
    }
    const { nextValues, logs } = executeRuntimeScript(script, runtimeValues);
    const computed = applyDerivedFormulas(selectedView?.components ?? [], nextValues);
    setRuntimeValues(computed);
    setRuntimeMessage(logs.length > 0 ? logs.join(' | ') : 'Script execute.');
  };

  const runScriptTester = () => {
    if (!selectedComponent || selectedComponent.type !== 'button') {
      setScriptTestResult('Selectionne un bouton.');
      return;
    }
    const script = selectedComponent.actionScript?.trim() || selectedComponent.formula?.trim() || '';
    if (!script) {
      setScriptTestResult('Script vide.');
      return;
    }
    try {
      const parsed = JSON.parse(scriptTestInput);
      const baseValues = parsed && typeof parsed === 'object' ? (parsed as RuntimeValues) : {};
      const { nextValues, logs } = executeRuntimeScript(script, baseValues);
      setScriptTestResult(
        `Logs:\\n${logs.join('\\n') || '(aucun)'}\\n\\nValeurs finales:\\n${JSON.stringify(nextValues, null, 2)}`
      );
    } catch (error) {
      setScriptTestResult(error instanceof Error ? `Erreur JSON: ${error.message}` : 'Erreur de test.');
    }
  };

  const applySelectedButtonTemplate = () => {
    if (!selectedComponent || selectedComponent.type !== 'button' || !selectedButtonTemplateId) {
      return;
    }
    const template = allButtonTemplates.find((item) => item.id === selectedButtonTemplateId);
    if (!template) {
      return;
    }
    updateSelectedComponent((item) => ({
      ...item,
      actionScript: template.script
    }));
    setSelectedButtonTemplateId('');
    setStatusMessage(`Template applique: ${template.label}`);
  };

  const saveCustomTemplateFromCurrentButton = () => {
    if (!selectedComponent || selectedComponent.type !== 'button') {
      return;
    }
    const name = newTemplateName.trim();
    const script = (selectedComponent.actionScript ?? '').trim();
    if (!name) {
      setErrorMessage('Nom du template requis.');
      return;
    }
    if (!script) {
      setErrorMessage('Le script du bouton est vide.');
      return;
    }
    const template: ButtonScriptTemplate = {
      id: makeId('tpl'),
      label: name,
      script
    };
    setCustomButtonTemplates((previous) => [template, ...previous]);
    setNewTemplateName('');
    setStatusMessage(`Template personnalise enregistre: ${name}`);
    setErrorMessage(null);
  };

  const deleteSelectedCustomTemplate = () => {
    if (!selectedButtonTemplateId) {
      return;
    }
    const template = customButtonTemplates.find((item) => item.id === selectedButtonTemplateId);
    if (!template) {
      setErrorMessage('Ce template est systeme et ne peut pas etre supprime.');
      return;
    }
    setCustomButtonTemplates((previous) => previous.filter((item) => item.id !== selectedButtonTemplateId));
    setSelectedButtonTemplateId('');
    setStatusMessage(`Template supprime: ${template.label}`);
    setErrorMessage(null);
  };

  const detachSelectedComponent = () => {
    if (!canEdit || !selectedComponent) {
      return;
    }
    updateSelectedView((view) => ({
      ...view,
      components: view.components.map((item) => (item.id === selectedComponent.id ? { ...item, parentId: undefined } : item))
    }));
  };

  const renderCanvasComponent = (component: StudioComponentDefinition, depth: number, ancestry: Set<string>): JSX.Element => {
    const family = getComponentFamily(component.type);
    const children = childrenByParent[component.id] ?? [];
    const isBlocked = ancestry.has(component.id);
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(component.id);

    return (
      <article
        key={component.id}
        className={`studio-component-card family-${family} type-${component.type} ${selectedComponentId === component.id ? 'is-selected' : ''} ${
          dragOverComponentId === component.id ? 'is-drag-over' : ''
        }`}
        style={{ marginLeft: `${Math.min(depth * 18, 140)}px` }}
        draggable={canEdit}
        onDragStart={(event) => handleComponentDragStart(event, component.id)}
        onDragOver={(event) => {
          if (canEdit) {
            event.preventDefault();
            setDragOverComponentId(component.id);
          }
        }}
        onDragLeave={() => setDragOverComponentId((current) => (current === component.id ? null : current))}
        onDrop={(event) => handleComponentDrop(event, component.id)}
        onClick={() => setSelectedComponentId(component.id)}
      >
        <div className="studio-component-card__head">
          <strong>{component.label || '(sans label)'}</strong>
          <span className={`studio-component-badge family-${family}`}>{component.type}</span>
        </div>
        <span>Cle: {component.key}</span>
        <div style={{ marginTop: '0.25rem' }}>{renderComponentPreview(component)}</div>
        <small>
          {canContain(component.type, 'row')
            ? 'Conteneur de lignes'
            : canContain(component.type, 'column')
            ? 'Conteneur de colonnes'
            : children.length > 0
            ? `${children.length} enfant(s)`
            : 'Bloc feuille'}
        </small>

        {children.length > 0 && !isBlocked ? (
          <div className="studio-component-children">
            {children.map((child) => renderCanvasComponent(child, depth + 1, nextAncestry))}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <Layout wide>
      {isLoading ? (
        <section className="card">Chargement du studio...</section>
      ) : (
        <>
          <section className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Studio de creation systeme</h1>
                <p style={{ marginTop: 0, marginBottom: 0 }}>
                  <Link to="/systems">Retour Atelier</Link> | Systeme: <strong>{system?.name ?? 'N/A'}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Button type="button" variant="secondary" onClick={() => setIsFullscreen((current) => !current)}>
                  {isFullscreen ? 'Quitter plein ecran studio' : 'Plein ecran studio'}
                </Button>
                <Button type="button" onClick={() => void saveStudio()} disabled={!canEdit || isSaving}>
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </div>
            {!canEdit ? <p style={{ marginBottom: 0, color: '#b42318' }}>Lecture seule: proprietaire/admin uniquement.</p> : null}
            {statusMessage ? <p style={{ marginBottom: 0, color: '#067647' }}>{statusMessage}</p> : null}
            {errorMessage ? <p style={{ marginBottom: 0, color: '#b42318' }}>{errorMessage}</p> : null}
            {canEdit ? (
              <p style={{ marginBottom: 0, opacity: 0.85 }}>
                {isDirty ? 'Modifications en attente (autosave: 60s).' : 'Studio a jour.'}
              </p>
            ) : null}
            {canEdit ? (
              <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.6rem' }}>
                <label style={{ display: 'grid', gap: '0.25rem' }}>
                  <span>Lecteurs supplementaires (IDs comptes, separes par virgule)</span>
                  <input
                    type="text"
                    value={viewerUserIdsDraft}
                    onChange={(event) => {
                      setViewerUserIdsDraft(event.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="user-a, user-b"
                    disabled={!canEdit}
                  />
                </label>
                <label style={{ display: 'grid', gap: '0.25rem' }}>
                  <span>Co-editeurs (IDs comptes, separes par virgule)</span>
                  <input
                    type="text"
                    value={editorUserIdsDraft}
                    onChange={(event) => {
                      setEditorUserIdsDraft(event.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="user-gm-2"
                    disabled={!canEdit}
                  />
                </label>
              </div>
            ) : null}
            {system?.auditTrail && system.auditTrail.length > 0 ? (
              <details style={{ marginTop: '0.6rem' }}>
                <summary>Audit trail ({system.auditTrail.length})</summary>
                <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.45rem' }}>
                  {[...system.auditTrail]
                    .reverse()
                    .slice(0, 12)
                    .map((entry) => (
                      <small key={entry.id}>
                        [{new Date(entry.at).toLocaleString()}] {entry.byUserId} - {entry.action} - {entry.summary}
                      </small>
                    ))}
                </div>
              </details>
            ) : null}
          </section>

          <section className={isFullscreen ? 'studio-fullscreen' : ''}>
            <section ref={studioLayoutRef} className="studio-layout" style={layoutStyle}>
              <aside className="studio-panel">
                <h2 style={{ marginTop: 0 }}>Arborescence composants</h2>
                <p style={{ marginTop: 0, fontSize: '0.9rem' }}>Glisse-depose vers la vue centrale.</p>
                <div className="studio-tree">
                  {PALETTE_TREE.map((branch) => (
                    <details key={branch.id} open>
                      <summary>{branch.label}</summary>
                      <div className="studio-palette-list">
                        {branch.items.map((item) => (
                          <button
                            key={`${branch.id}-${item.type}`}
                            type="button"
                            className="button secondary"
                            draggable={canEdit}
                            onDragStart={(event) => handlePaletteDragStart(event, item)}
                            style={{ textAlign: 'left' }}
                          >
                            {item.label} ({item.type})
                          </button>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </aside>

              <div className="studio-splitter" onMouseDown={(event) => startResizing('left', event)} title="Redimensionner" />

              <section
                className="studio-panel"
                onDragOver={(event) => {
                  if (canEdit) {
                    event.preventDefault();
                  }
                }}
                onDrop={handleCanvasDrop}
              >
                <h2 style={{ marginTop: 0 }}>Vue / fiche (zone centrale)</h2>
                <div className="studio-views">
                  <label style={{ display: 'grid', gap: '0.35rem' }}>
                    <span>Vue active</span>
                    <select value={selectedView?.id ?? ''} onChange={(event) => setSelectedViewId(event.target.value)}>
                      {(schema?.views ?? []).map((view) => (
                        <option key={view.id} value={view.id}>
                          {view.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button type="button" variant="secondary" onClick={addView} disabled={!canEdit}>
                      + Vue
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={removeSelectedView}
                      disabled={!canEdit || (schema?.views.length ?? 0) <= 1}
                    >
                      Supprimer vue
                    </Button>
                  </div>
                </div>

                <div className="studio-canvas">
                  {selectedView ? (
                    <>
                      <label style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                        <span>Nom de la vue</span>
                        <input
                          type="text"
                          value={selectedView.name}
                          onChange={(event) => updateSelectedView((view) => ({ ...view, name: event.target.value }))}
                          disabled={!canEdit}
                        />
                      </label>
                      <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.9rem', opacity: 0.9 }}>
                        Astuce: depose un <strong>Tableau</strong> pour creer automatiquement <strong>Ligne</strong> puis <strong>Colonne</strong>.
                        Les blocs logiques (IF/THEN/ELSE/OR/NOT) sont aussi imbriquables.
                      </p>

                      {selectedView.components.length === 0 ? (
                        <p style={{ margin: 0 }}>Depose un composant ici pour commencer.</p>
                      ) : (
                        <div className="studio-components-grid">
                          {rootComponents.map((component) => renderCanvasComponent(component, 0, new Set<string>()))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: 0 }}>Aucune vue disponible.</p>
                  )}
                </div>

                <section className="studio-runtime">
                  <h3 style={{ marginTop: 0 }}>Apercu runtime (calculs / references / des)</h3>
                  {runtimeMessage ? <p style={{ marginTop: 0 }}>{runtimeMessage}</p> : null}
                  {!selectedView || selectedView.components.length === 0 ? (
                    <p style={{ margin: 0 }}>Ajoute des composants pour voir un rendu interactif.</p>
                  ) : (
                    <div className="studio-runtime-grid">
                      {visibleRuntimeComponents.map((component) => {
                        const value = runtimeValues[component.key];
                        return (
                          <article key={`runtime-${component.id}`} className="studio-runtime-item">
                            <strong>{component.label || component.key}</strong>
                            <small>{component.key}</small>
                            {component.type === 'text' || component.type === 'color' || component.type === 'date' || component.type === 'time' || component.type === 'avatar' ? (
                              <input
                                type={component.type === 'color' ? 'color' : component.type === 'date' ? 'date' : component.type === 'time' ? 'time' : 'text'}
                                value={typeof value === 'string' ? value : ''}
                                onChange={(event) => setRuntimeValue(component, event.target.value)}
                              />
                            ) : null}
                            {component.type === 'textarea' ? (
                              <textarea rows={2} value={typeof value === 'string' ? value : ''} onChange={(event) => setRuntimeValue(component, event.target.value)} />
                            ) : null}
                            {component.type === 'number' || component.type === 'range' ? (
                              <input
                                type={component.type === 'number' ? 'number' : 'range'}
                                min={component.min ?? 0}
                                max={component.max ?? 100}
                                step={component.step ?? 1}
                                value={typeof value === 'number' ? value : 0}
                                onChange={(event) => setRuntimeValue(component, Number(event.target.value))}
                              />
                            ) : null}
                            {component.type === 'checkbox' ? (
                              <label>
                                <input type="checkbox" checked={Boolean(value)} onChange={(event) => setRuntimeValue(component, event.target.checked)} /> active
                              </label>
                            ) : null}
                            {component.type === 'choice' || component.type === 'tabs' || component.type === 'tabs_nested' ? (
                              <select value={typeof value === 'string' ? value : ''} onChange={(event) => setRuntimeValue(component, event.target.value)}>
                                {(component.options ?? []).map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {component.type === 'button' ? (
                              <button className="button secondary" onClick={() => runButtonScript(component)}>
                                {String(component.defaultValue || component.label || 'Action')}
                              </button>
                            ) : null}
                            {component.type === 'label' ? <p style={{ margin: 0 }}>{String(component.defaultValue || component.label || '')}</p> : null}
                            {component.type === 'dice_roll' ? (
                              <button
                                className="button secondary"
                                onClick={() => {
                                  const result = rollDice(component.diceFormula || component.formula || '1d20', runtimeValues);
                                  if (!result) {
                                    setRuntimeMessage(`Jet invalide: ${component.diceFormula || component.formula || ''}`);
                                    return;
                                  }
                                  setRuntimeMessage(`Jet ${component.label}: ${result.total} (${result.detail})`);
                                }}
                              >
                                Lancer ({component.diceFormula || component.formula || '1d20'})
                              </button>
                            ) : null}
                            {component.type === 'table' || component.type === 'inventory' ? (
                              <div style={{ display: 'grid', gap: '0.3rem' }}>
                                <code>{(component.columns ?? []).join(' | ')}</code>
                                <button
                                  className="button secondary"
                                  onClick={() => {
                                    const columns = component.columns ?? ['Nom', 'Valeur'];
                                    const row = columns.reduce<Record<string, string>>((acc, column) => {
                                      acc[column] = '';
                                      return acc;
                                    }, {});
                                    const rows = Array.isArray(value) ? (value as Array<Record<string, string>>) : [];
                                    setRuntimeValue(component, [...rows, row]);
                                  }}
                                >
                                  Ajouter ligne
                                </button>
                                <small>Lignes: {Array.isArray(value) ? value.length : 0}</small>
                              </div>
                            ) : null}
                            {component.type === 'relation' ? (
                              <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <select
                                  value={typeof value === 'string' ? value : ''}
                                  onChange={(event) => setRuntimeValue(component, event.target.value)}
                                >
                                  <option value="">Cible</option>
                                  {relationTargets.map((target) => (
                                    <option key={target} value={target}>
                                      {target}
                                    </option>
                                  ))}
                                </select>
                                <small>target: {component.relationTarget || '(non defini)'}</small>
                              </div>
                            ) : null}
                            {component.formula ? <small>formule: {component.formula}</small> : null}
                            {component.reference ? <small>ref: {component.reference}</small> : null}
                            {component.showIf ? <small>showIf: {component.showIf}</small> : null}
                            {runtimeValidationErrors[component.key] ? (
                              <small style={{ color: '#b42318' }}>{runtimeValidationErrors[component.key]}</small>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </section>

              <div className="studio-splitter" onMouseDown={(event) => startResizing('right', event)} title="Redimensionner" />

              <aside className="studio-panel">
                <h2 style={{ marginTop: 0 }}>Proprietes</h2>
                {selectedComponent ? (
                  <div className="studio-properties">
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Type: <strong>{selectedComponent.type}</strong>
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      Parent: <strong>{selectedComponent.parentId || 'racine'}</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={detachSelectedComponent}
                        disabled={!canEdit || !selectedComponent.parentId}
                      >
                        Remonter a la racine
                      </Button>
                    </div>
                    <label>
                      <span>Label</span>
                      <input
                        type="text"
                        value={selectedComponent.label}
                        onChange={(event) => updateSelectedComponent((item) => ({ ...item, label: event.target.value }))}
                        disabled={!canEdit}
                      />
                    </label>
                    <label>
                      <span>Cle technique</span>
                      <input
                        type="text"
                        value={selectedComponent.key}
                        onChange={(event) => updateSelectedComponent((item) => ({ ...item, key: event.target.value }))}
                        disabled={!canEdit}
                      />
                    </label>
                    <label>
                      <span>Placeholder</span>
                      <input
                        type="text"
                        value={selectedComponent.placeholder ?? ''}
                        onChange={(event) => updateSelectedComponent((item) => ({ ...item, placeholder: event.target.value }))}
                        disabled={!canEdit}
                      />
                    </label>
                    <label>
                      <span>Reference (@champ)</span>
                      <input
                        type="text"
                        value={selectedComponent.reference ?? ''}
                        onChange={(event) => updateSelectedComponent((item) => ({ ...item, reference: event.target.value }))}
                        disabled={!canEdit}
                        placeholder="@force"
                      />
                    </label>
                    <label>
                      <span>Formule</span>
                      <input
                        type="text"
                        value={selectedComponent.formula ?? ''}
                        onChange={(event) => updateSelectedComponent((item) => ({ ...item, formula: event.target.value }))}
                        disabled={!canEdit}
                        placeholder="@force + @agilite"
                      />
                    </label>
                    <label>
                      <span>Afficher si (showIf)</span>
                      <input
                        type="text"
                        value={selectedComponent.showIf ?? ''}
                        onChange={(event) => updateSelectedComponent((item) => ({ ...item, showIf: event.target.value }))}
                        disabled={!canEdit}
                        placeholder="@niveau >= 5 && @classe == 'mage'"
                      />
                    </label>
                    <label>
                      <span>Validation regex</span>
                      <input
                        type="text"
                        value={selectedComponent.validationPattern ?? ''}
                        onChange={(event) =>
                          updateSelectedComponent((item) => ({ ...item, validationPattern: event.target.value }))
                        }
                        disabled={!canEdit}
                        placeholder="^[A-Z]{2}[0-9]{3}$"
                      />
                    </label>
                    <label>
                      <span>Message validation</span>
                      <input
                        type="text"
                        value={selectedComponent.validationMessage ?? ''}
                        onChange={(event) =>
                          updateSelectedComponent((item) => ({ ...item, validationMessage: event.target.value }))
                        }
                        disabled={!canEdit}
                        placeholder="Format invalide"
                      />
                    </label>
                    {selectedComponent.type === 'button' ? (
                      <>
                        <label>
                          <span>Template de script</span>
                          <select
                            value={selectedButtonTemplateId}
                            onChange={(event) => setSelectedButtonTemplateId(event.target.value)}
                            disabled={!canEdit}
                          >
                            <option value="">Choisir un template</option>
                            <optgroup label="Systeme">
                              {BUTTON_SCRIPT_TEMPLATES.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.label}
                                </option>
                              ))}
                            </optgroup>
                            {customButtonTemplates.length > 0 ? (
                              <optgroup label="Personnalises">
                                {customButtonTemplates.map((template) => (
                                  <option key={template.id} value={template.id}>
                                    {template.label}
                                  </option>
                                ))}
                              </optgroup>
                            ) : null}
                          </select>
                        </label>
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={applySelectedButtonTemplate}
                            disabled={!canEdit || !selectedButtonTemplateId}
                          >
                            Appliquer template
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={deleteSelectedCustomTemplate}
                            disabled={!canEdit || !customButtonTemplates.some((item) => item.id === selectedButtonTemplateId)}
                          >
                            Supprimer template
                          </Button>
                        </div>
                        <label>
                          <span>Nouveau template (nom)</span>
                          <input
                            type="text"
                            value={newTemplateName}
                            onChange={(event) => setNewTemplateName(event.target.value)}
                            disabled={!canEdit}
                            placeholder="Ex: Degats critiques"
                          />
                        </label>
                        <div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={saveCustomTemplateFromCurrentButton}
                            disabled={!canEdit || !newTemplateName.trim() || !(selectedComponent.actionScript ?? '').trim()}
                          >
                            Enregistrer comme template perso
                          </Button>
                        </div>
                        <label>
                          <span>Script bouton (multiligne)</span>
                          <textarea
                            rows={7}
                            value={selectedComponent.actionScript ?? ''}
                            onChange={(event) =>
                              updateSelectedComponent((item) => ({ ...item, actionScript: event.target.value }))
                            }
                            disabled={!canEdit}
                            placeholder={'IF @hp > 0\\nSET hp = @hp - 1\\nELSE\\nTOGGLE ko\\nENDIF'}
                          />
                        </label>
                        <small>
                          Commandes: <code>IF</code>, <code>ELSE</code>, <code>ENDIF</code>, <code>SET</code>,{' '}
                          <code>ADD</code>, <code>TOGGLE</code>, <code>ROLL</code>.
                        </small>
                        <details>
                          <summary>Tester le script</summary>
                          <label style={{ display: 'grid', gap: '0.25rem', marginTop: '0.4rem' }}>
                            <span>Valeurs JSON d entree</span>
                            <textarea
                              rows={6}
                              value={scriptTestInput}
                              onChange={(event) => setScriptTestInput(event.target.value)}
                              placeholder='{"hp":10,"attaque":3}'
                            />
                          </label>
                          <div style={{ marginTop: '0.45rem' }}>
                            <Button type="button" variant="secondary" onClick={runScriptTester}>
                              Executer test
                            </Button>
                          </div>
                          {scriptTestResult ? (
                            <pre
                              style={{
                                marginTop: '0.45rem',
                                whiteSpace: 'pre-wrap',
                                border: '1px solid #334155',
                                borderRadius: 8,
                                padding: '0.55rem'
                              }}
                            >
                              {scriptTestResult}
                            </pre>
                          ) : null}
                        </details>
                      </>
                    ) : null}

                    {selectedComponent.type === 'choice' ||
                    selectedComponent.type === 'tabs' ||
                    selectedComponent.type === 'tabs_nested' ||
                    selectedComponent.type === 'repeater' ? (
                      <label>
                        <span>Options (une par ligne)</span>
                        <textarea
                          rows={4}
                          value={(selectedComponent.options ?? []).join('\n')}
                          onChange={(event) =>
                            updateSelectedComponent((item) => ({
                              ...item,
                              options: event.target.value
                                .split('\n')
                                .map((line) => line.trim())
                                .filter(Boolean)
                            }))
                          }
                          disabled={!canEdit}
                        />
                      </label>
                    ) : null}

                    {selectedComponent.type === 'table' || selectedComponent.type === 'inventory' ? (
                      <label>
                        <span>Colonnes (une par ligne)</span>
                        <textarea
                          rows={4}
                          value={(selectedComponent.columns ?? []).join('\n')}
                          onChange={(event) =>
                            updateSelectedComponent((item) => ({
                              ...item,
                              columns: event.target.value
                                .split('\n')
                                .map((line) => line.trim())
                                .filter(Boolean)
                            }))
                          }
                          disabled={!canEdit}
                        />
                      </label>
                    ) : null}

                    {selectedComponent.type === 'dice_roll' ? (
                      <label>
                        <span>Formule de des</span>
                        <input
                          type="text"
                          value={selectedComponent.diceFormula ?? ''}
                          onChange={(event) => updateSelectedComponent((item) => ({ ...item, diceFormula: event.target.value }))}
                          disabled={!canEdit}
                          placeholder="1d20+@mod"
                        />
                      </label>
                    ) : null}

                    {selectedComponent.type === 'relation' ? (
                      <>
                        <label>
                          <span>Cible relationnelle</span>
                          <input
                            type="text"
                            value={selectedComponent.relationTarget ?? ''}
                            onChange={(event) =>
                              updateSelectedComponent((item) => ({ ...item, relationTarget: event.target.value }))
                            }
                            disabled={!canEdit}
                            placeholder="character|item|npc"
                          />
                        </label>
                        <label>
                          <span>Liens multiples</span>
                          <select
                            value={String(Boolean(selectedComponent.allowMultiple))}
                            onChange={(event) =>
                              updateSelectedComponent((item) => ({ ...item, allowMultiple: event.target.value === 'true' }))
                            }
                            disabled={!canEdit}
                          >
                            <option value="false">Non</option>
                            <option value="true">Oui</option>
                          </select>
                        </label>
                      </>
                    ) : null}

                    {selectedComponent.type === 'number' || selectedComponent.type === 'range' ? (
                      <>
                        <label>
                          <span>Min</span>
                          <input
                            type="number"
                            value={selectedComponent.min ?? 0}
                            onChange={(event) => updateSelectedComponent((item) => ({ ...item, min: Number(event.target.value) }))}
                            disabled={!canEdit}
                          />
                        </label>
                        <label>
                          <span>Max</span>
                          <input
                            type="number"
                            value={selectedComponent.max ?? 100}
                            onChange={(event) => updateSelectedComponent((item) => ({ ...item, max: Number(event.target.value) }))}
                            disabled={!canEdit}
                          />
                        </label>
                        <label>
                          <span>Step</span>
                          <input
                            type="number"
                            value={selectedComponent.step ?? 1}
                            onChange={(event) => updateSelectedComponent((item) => ({ ...item, step: Number(event.target.value) }))}
                            disabled={!canEdit}
                          />
                        </label>
                      </>
                    ) : null}

                    {selectedComponent.type === 'checkbox' ? (
                      <label>
                        <span>Valeur par defaut</span>
                        <select
                          value={String(Boolean(selectedComponent.defaultValue))}
                          onChange={(event) =>
                            updateSelectedComponent((item) => ({ ...item, defaultValue: event.target.value === 'true' }))
                          }
                          disabled={!canEdit}
                        >
                          <option value="false">False</option>
                          <option value="true">True</option>
                        </select>
                      </label>
                    ) : null}

                    {selectedComponent.type !== 'checkbox' ? (
                      <label>
                        <span>Valeur par defaut</span>
                        <input
                          type={selectedComponent.type === 'number' || selectedComponent.type === 'range' ? 'number' : 'text'}
                          value={
                            typeof selectedComponent.defaultValue === 'number'
                              ? selectedComponent.defaultValue
                              : typeof selectedComponent.defaultValue === 'string'
                              ? selectedComponent.defaultValue
                              : ''
                          }
                          onChange={(event) =>
                            updateSelectedComponent((item) => ({
                              ...item,
                              defaultValue:
                                selectedComponent.type === 'number' || selectedComponent.type === 'range'
                                  ? Number(event.target.value)
                                  : event.target.value
                            }))
                          }
                          disabled={!canEdit}
                        />
                      </label>
                    ) : null}

                    <label>
                      <span>Obligatoire</span>
                      <select
                        value={String(Boolean(selectedComponent.required))}
                        onChange={(event) =>
                          updateSelectedComponent((item) => ({ ...item, required: event.target.value === 'true' }))
                        }
                        disabled={!canEdit}
                      >
                        <option value="false">Non</option>
                        <option value="true">Oui</option>
                      </select>
                    </label>

                    <Button type="button" variant="secondary" onClick={deleteSelectedComponent} disabled={!canEdit}>
                      Supprimer ce composant
                    </Button>

                    <p style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                      Astuce: utilise <code>@nomChamp</code> dans references/formules pour lier les champs.
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>Selectionne un composant dans la vue centrale.</p>
                )}
              </aside>
            </section>
          </section>
        </>
      )}
    </Layout>
  );
}
