import { WidgetConfig } from '../dashboard/components/DashboardLayout';

export const gmWidgets: WidgetConfig[] = [
  { id: 'initiative', type: 'initiative', title: 'Initiative & Combat' },
  { id: 'characters', type: 'character', title: 'Fiches' },
  { id: 'chat', type: 'chat', title: 'Chat & Messages' },
  { id: 'documents', type: 'documents', title: 'Documents' },
  { id: 'notes', type: 'notes', title: 'Notes' }
];

export const playerWidgets: WidgetConfig[] = [
  { id: 'my-character', type: 'character', title: 'Mon personnage' },
  { id: 'chat', type: 'chat', title: 'Chat & Messages' },
  { id: 'documents', type: 'documents', title: 'Documents recus' },
  { id: 'notes', type: 'notes', title: 'Notes & Journal' }
];
