export interface SystemRollDefinition {
  id: string;
  label: string;
  formula: string;
  description?: string;
}

export interface GameSystem {
  id: string;
  name: string;
  version: string;
  author?: string;
  tags?: string[];
  rollDefinitions?: SystemRollDefinition[];
  createdAt: string;
  updatedAt: string;
}
