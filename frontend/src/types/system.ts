import { CharacterSheetView } from './characterSheet';

export interface SystemRollDefinition {
  id: string;
  label: string;
  formula: string;
  description?: string;
}

export type RulesBlockType = 'set_secondary_stat' | 'define_roll';
export type NumericOperation = 'sum' | 'subtract' | 'multiply' | 'average';
export type NumericRounding = 'none' | 'floor' | 'ceil' | 'round';

export interface SetSecondaryStatBlock {
  id: string;
  type: 'set_secondary_stat';
  label: string;
  targetFieldId: string;
  sourceFieldIds: string[];
  operation: NumericOperation;
  constantModifier?: number;
  rounding?: NumericRounding;
}

export interface DefineRollBlock {
  id: string;
  type: 'define_roll';
  actionId: string;
  label: string;
  description?: string;
  diceCount: number;
  diceSides: number;
  modifierFieldId?: string;
  flatModifier?: number;
}

export type RulesProgramBlock = SetSecondaryStatBlock | DefineRollBlock;
export type GameSystemVisibility = 'public' | 'private';
export type RulesGroupLayout = 'full' | 'half';

export interface RulesPresentationGroup {
  id: string;
  name: string;
  showTitle: boolean;
  layout: RulesGroupLayout;
  blockIds: string[];
}

export interface RulesPresentation {
  groups: RulesPresentationGroup[];
}

export type StudioComponentType = 'text' | 'number' | 'checkbox' | 'button';

export interface StudioComponentDefinition {
  id: string;
  type: StudioComponentType;
  label: string;
  key: string;
  defaultValue?: string | number | boolean;
  reference?: string;
  formula?: string;
}

export interface StudioViewDefinition {
  id: string;
  name: string;
  components: StudioComponentDefinition[];
}

export interface StudioSchema {
  views: StudioViewDefinition[];
}

export interface GameSystem {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  ownerUserId: string;
  visibility: GameSystemVisibility;
  forkedFromSystemId?: string;
  forkedFromSystemName?: string;
  tags?: string[];
  rollDefinitions?: SystemRollDefinition[];
  rulesProgram?: RulesProgramBlock[];
  rulesPresentation?: RulesPresentation;
  studioSchema?: StudioSchema;
  referenceSheets?: CharacterSheetView[];
  createdAt: string;
  updatedAt: string;
}
