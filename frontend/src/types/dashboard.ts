export type DashboardRole = 'gm' | 'player';
export type DashboardWidgetSize = 'small' | 'medium' | 'large';

export interface DashboardProfile {
  id: string;
  userId: string;
  role: DashboardRole;
  sessionId?: string | null;
  name: string;
  isFavorite: boolean;
  widgetOrder: string[];
  hiddenWidgetIds: string[];
  widgetSizes: Record<string, DashboardWidgetSize>;
  createdAt: string;
  updatedAt: string;
}
