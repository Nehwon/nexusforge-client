import { CharacterSheetView, SheetAction } from '../types/characterSheet';
import { DefineRollBlock, GameSystem, NumericRounding, RulesProgramBlock, SetSecondaryStatBlock } from '../types/system';

export type RollResult = {
  total: number;
  breakdown: string;
  formula: string;
};

function asNumber(value: number | string | boolean | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildNumericFieldMap(sheet: CharacterSheetView): Record<string, number> {
  return sheet.fields.reduce<Record<string, number>>((accumulator, field) => {
    const numericValue = asNumber(field.value);
    if (numericValue !== null) {
      accumulator[field.id] = numericValue;
    }
    return accumulator;
  }, {});
}

function applyRounding(value: number, rounding: NumericRounding | undefined): number {
  switch (rounding) {
    case 'floor':
      return Math.floor(value);
    case 'ceil':
      return Math.ceil(value);
    case 'round':
      return Math.round(value);
    default:
      return value;
  }
}

function computeSecondaryValue(block: SetSecondaryStatBlock, sheet: CharacterSheetView): number | null {
  const numericMap = buildNumericFieldMap(sheet);
  const sourceValues = block.sourceFieldIds
    .map((fieldId) => numericMap[fieldId])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (sourceValues.length === 0) {
    return null;
  }

  let baseValue = 0;

  if (block.operation === 'sum') {
    baseValue = sourceValues.reduce((sum, value) => sum + value, 0);
  } else if (block.operation === 'subtract') {
    baseValue = sourceValues.slice(1).reduce((sum, value) => sum - value, sourceValues[0] ?? 0);
  } else if (block.operation === 'multiply') {
    baseValue = sourceValues.reduce((product, value) => product * value, 1);
  } else if (block.operation === 'average') {
    baseValue = sourceValues.reduce((sum, value) => sum + value, 0) / sourceValues.length;
  }

  const valueWithModifier = baseValue + (block.constantModifier ?? 0);
  return applyRounding(valueWithModifier, block.rounding);
}

function applySetSecondaryStatBlock(block: SetSecondaryStatBlock, sheet: CharacterSheetView): CharacterSheetView {
  const computedValue = computeSecondaryValue(block, sheet);
  if (computedValue === null) {
    return sheet;
  }

  const hasTargetField = sheet.fields.some((field) => field.id === block.targetFieldId);

  if (!hasTargetField) {
    return {
      ...sheet,
      fields: [
        ...sheet.fields,
        {
          id: block.targetFieldId,
          label: block.label,
          type: 'number',
          value: computedValue,
          groupId: sheet.groups[0]?.id ?? 'valeurs_secondaires'
        }
      ]
    };
  }

  return {
    ...sheet,
    fields: sheet.fields.map((field) => {
      if (field.id !== block.targetFieldId) {
        return field;
      }

      if (field.type === 'resource' && typeof field.max === 'number') {
        return {
          ...field,
          value: Math.max(0, Math.min(field.max, computedValue))
        };
      }

      return {
        ...field,
        value: computedValue
      };
    })
  };
}

function buildRollFormula(block: DefineRollBlock): string {
  const variableChunk = block.modifierFieldId ? ` + ${block.modifierFieldId}` : '';
  const flat = block.flatModifier ?? 0;
  const flatChunk = flat === 0 ? '' : ` ${flat > 0 ? '+' : '-'} ${Math.abs(flat)}`;
  return `${block.diceCount}d${block.diceSides}${variableChunk}${flatChunk}`;
}

function buildActionsFromProgram(program: RulesProgramBlock[] | undefined): SheetAction[] {
  if (!program || program.length === 0) {
    return [];
  }

  return program
    .filter((block): block is DefineRollBlock => block.type === 'define_roll')
    .map((block) => ({
      id: block.actionId,
      label: block.label,
      description: block.description,
      rollFormula: buildRollFormula(block),
      rollConfig: {
        sourceBlockId: block.id,
        diceCount: block.diceCount,
        diceSides: block.diceSides,
        modifierFieldId: block.modifierFieldId,
        flatModifier: block.flatModifier
      }
    }));
}

export function applyRulesProgramToSheet(sheet: CharacterSheetView, system: GameSystem | null): CharacterSheetView {
  if (!system?.rulesProgram || system.rulesProgram.length === 0) {
    return sheet;
  }

  let nextSheet = { ...sheet, fields: [...sheet.fields] };

  for (const block of system.rulesProgram) {
    if (block.type === 'set_secondary_stat') {
      nextSheet = applySetSecondaryStatBlock(block, nextSheet);
    }
  }

  const generatedActions = buildActionsFromProgram(system.rulesProgram);
  if (generatedActions.length > 0) {
    nextSheet = {
      ...nextSheet,
      actions: generatedActions
    };
  }

  return nextSheet;
}

function resolveLegacyFormula(formula: string, sheet: CharacterSheetView): string {
  const numericMap = buildNumericFieldMap(sheet);

  return formula.replace(/\b[a-zA-Z_][\w-]*\b/g, (token) => {
    if (/^\d*d\d+$/i.test(token)) {
      return token;
    }

    const resolved = numericMap[token];
    return Number.isFinite(resolved) ? String(resolved) : '0';
  });
}

function rollFromFormula(formula: string): RollResult {
  const diceMatch = formula.match(/(\d*)d(\d+)/i);
  const diceCount = Number(diceMatch?.[1] || 1);
  const diceSides = Number(diceMatch?.[2] || 20);

  const rolls = Array.from({ length: Math.max(1, diceCount) }, () => Math.floor(Math.random() * Math.max(2, diceSides)) + 1);
  const diceSum = rolls.reduce((sum, value) => sum + value, 0);

  const modifiers = Array.from(formula.matchAll(/([+-]\s*\d+)/g)).map((match) => Number(match[1].replace(/\s+/g, '')));
  const modifierSum = modifiers.reduce((sum, value) => sum + value, 0);

  return {
    total: diceSum + modifierSum,
    formula,
    breakdown: `${rolls.join(' + ')}${modifierSum !== 0 ? ` ${modifierSum > 0 ? '+' : '-'} ${Math.abs(modifierSum)}` : ''}`
  };
}

export function rollForAction(action: SheetAction, sheet: CharacterSheetView): RollResult {
  if (action.rollConfig) {
    const diceCount = Math.max(1, action.rollConfig.diceCount || 1);
    const diceSides = Math.max(2, action.rollConfig.diceSides || 20);
    const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceSides) + 1);
    const diceSum = rolls.reduce((sum, value) => sum + value, 0);

    const numericMap = buildNumericFieldMap(sheet);
    const fieldModifier = action.rollConfig.modifierFieldId ? numericMap[action.rollConfig.modifierFieldId] ?? 0 : 0;
    const flatModifier = action.rollConfig.flatModifier ?? 0;
    const totalModifier = fieldModifier + flatModifier;

    return {
      total: diceSum + totalModifier,
      formula: action.rollFormula ?? `${diceCount}d${diceSides}`,
      breakdown: `${rolls.join(' + ')}${
        totalModifier !== 0 ? ` ${totalModifier > 0 ? '+' : '-'} ${Math.abs(totalModifier)}` : ''
      }`
    };
  }

  const resolved = resolveLegacyFormula(action.rollFormula ?? '1d20', sheet);
  return rollFromFormula(resolved);
}
