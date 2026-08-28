/** Katalog aller wählbaren Admin-/Manager-Dashboard-Module (siehe DashboardSettingsModal + DashboardPage). */
export interface DashboardModuleDef {
  id: string;
  label: string;
  /** Berechtigung, die für dieses Modul nötig ist — fehlt sie, ist das Modul für Manager weder wählbar noch sichtbar. Admin sieht immer alles. */
  perm?: string;
  /** Layout-Hinweis: "sm" = kompakte Kennzahl, "half" = ca. halbe Dashboard-Zeile (paart sich mit dem
   * nächsten "half"-Modul), "lg" = Liste/Tabelle über die volle Breite, "xl" = erzwungene volle
   * Dashboard-Zeile. */
  size: 'sm' | 'half' | 'lg' | 'xl';
}

export const DASHBOARD_MODULES: DashboardModuleDef[] = [
  { id: 'kpi-active-now', label: 'Aktuell im Einsatz', size: 'sm' },
  { id: 'kpi-pause', label: 'In Pause', size: 'sm' },
  // Tickets und Materialanfragen sind die wichtigsten Arbeitsbereiche im Dashboard, aber klar getrennte
  // Datenquellen (siehe DashboardPage.tsx) — bewusst gleich gross und nebeneinander (size "half"), damit
  // beide sofort und gleichwertig sichtbar sind, statt eine kleine Kennzahl-Karte zu sein.
  { id: 'kpi-tickets', label: 'Tickets', perm: 'tickets_view_all', size: 'half' },
  { id: 'kpi-materials', label: 'Materialanfragen', perm: 'material_manage', size: 'half' },
  // Ruhiger Monatskalender: manuelle Termine (state.calendarEvents) + Tickets mit Fälligkeitsdatum
  // (dynamisch aus state.tickets abgeleitet, siehe DashboardCalendar.tsx) — keine eigene Berechtigung,
  // da manuelle Termine für jeden Admin/Manager gelten und Tickets bereits selbst rollenscoped sind.
  { id: 'dash-calendar', label: 'Kalender', size: 'xl' },
  { id: 'kpi-open-entries', label: 'Offene Zeiteinträge', size: 'sm' },
  { id: 'today-entries', label: 'Heutige Zeiterfassungen', size: 'lg' },
  { id: 'kpi-absences-today', label: 'Abwesenheiten heute', size: 'sm' },
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
