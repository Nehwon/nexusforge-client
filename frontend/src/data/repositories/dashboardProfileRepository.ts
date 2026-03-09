import { db, ensureDatabaseIsInitialized } from '../db';
import { DashboardProfile, DashboardRole, DashboardWidgetSize } from '../../types/dashboard';

function buildDefaultWidgetSizes(widgetIds: string[]): Record<string, DashboardWidgetSize> {
  return widgetIds.reduce<Record<string, DashboardWidgetSize>>((accumulator, widgetId) => {
    accumulator[widgetId] = 'medium';
    return accumulator;
  }, {});
}

export const dashboardProfileRepository = {
  async listForUserRole(userId: string, role: DashboardRole): Promise<DashboardProfile[]> {
    await ensureDatabaseIsInitialized();
    const profiles = await db.dashboardProfiles.where('userId').equals(userId).toArray();
    return profiles
      .filter((profile) => profile.role === role)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async createProfile(params: {
    userId: string;
    role: DashboardRole;
    name: string;
    widgetIds: string[];
    sourceProfile?: DashboardProfile;
    isFavorite?: boolean;
  }): Promise<DashboardProfile> {
    await ensureDatabaseIsInitialized();
    const now = new Date().toISOString();

    const profile: DashboardProfile = {
      id: crypto.randomUUID(),
      userId: params.userId,
      role: params.role,
      name: params.name,
      isFavorite: params.isFavorite ?? false,
      widgetOrder: params.sourceProfile?.widgetOrder ?? params.widgetIds,
      hiddenWidgetIds: params.sourceProfile?.hiddenWidgetIds ?? [],
      widgetSizes: params.sourceProfile?.widgetSizes ?? buildDefaultWidgetSizes(params.widgetIds),
      createdAt: now,
      updatedAt: now
    };

    await db.dashboardProfiles.put(profile);
    return profile;
  },

  async upsert(profile: DashboardProfile): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.dashboardProfiles.put({
      ...profile,
      updatedAt: new Date().toISOString()
    });
  },

  async delete(profileId: string): Promise<void> {
    await ensureDatabaseIsInitialized();
    await db.dashboardProfiles.delete(profileId);
  }
};
