/** Katalog aller wählbaren Admin-/Manager-Dashboard-Module (siehe DashboardSettingsModal + DashboardPage). */
export interface DashboardModuleDef {
  id: string;
  label: string;
  /** Berechtigung, die für dieses Modul nötig ist — fehlt sie, ist das Modul für Manager weder wählbar noch sichtbar. Admin sieht immer alles. */
  perm?: string;
  /** Layout-Hinweis: "sm" = kompakte Kennzahl, "lg" = Liste/Tabelle über die volle Breite. */
  size: 'sm' | 'lg';
}

export const DASHBOARD_MODULES: DashboardModuleDef[] = [
  { id: 'kpi-active-now', label: 'Aktuell im Einsatz', size: 'sm' },
  { id: 'kpi-pause', label: 'In Pause', size: 'sm' },
  { id: 'mat-new', label: 'Neue Materialanfragen', perm: 'material_manage', size: 'lg' },
  { id: 'tick-urgent', label: 'Dringende Tickets', perm: 'tickets_view_all', size: 'lg' },
  { id: 'tick-overdue', label: 'Überfällige Tickets', perm: 'tickets_view_all', size: 'lg' },
  { id: 'kpi-open-entries', label: 'Offene Zeiteinträge', size: 'sm' },
  { id: 'today-entries', label: 'Heutige Zeiterfassungen', size: 'lg' },
  { id: 'kpi-absences-today', label: 'Abwesenheiten heute', size: 'sm' },
  { id: 'ticket-calendar-today', label: 'Ticket-Kalender heute', perm: 'tickets_calendar_view', size: 'lg' },
  { id: 'ticket-status-overview', label: 'Ticket-Statusübersicht', perm: 'tickets_view_all', size: 'lg' },
  { id: 'chat-new', label: 'Neue Chat-Nachrichten', size: 'lg' },
  { id: 'reports', label: 'Berichte', perm: 'reports_view', size: 'sm' },
  { id: 'exports', label: 'Exporte', perm: 'time_export', size: 'sm' },
  { id: 'kpi-active-emp', label: 'Aktive Mitarbeiter', size: 'sm' },
  { id: 'kpi-geofence', label: 'Geofencing-Hinweise', size: 'sm' },
  { id: 'kpi-hours-week', label: 'Stunden diese Woche', size: 'sm' },
  { id: 'stamp-live', label: 'Ein-/Ausstempeln & Live-Status', size: 'lg' },
  { id: 'today-shifts', label: 'Heutige Schichten', perm: 'schedule_view', size: 'lg' },
  { id: 'upcoming-absences', label: 'Anstehende Abwesenheiten', size: 'lg' },
  { id: 'te-overview', label: 'Zeiterfassung im Überblick', size: 'lg' },
];

export function moduleLabel(id: string): string {
  return DASHBOARD_MODULES.find((m) => m.id === id)?.label ?? id;
}
