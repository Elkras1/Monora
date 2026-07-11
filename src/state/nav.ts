import type { AppState } from './AppContext';
import type { IconName } from '../components/icons/Icon';
import type { SystemRole, ViewId } from '../types';
import { hasPerm } from './selectors';

export interface NavItem {
  view: ViewId;
  icon: IconName;
  label: string;
}

export function navConfigFor(role: SystemRole, state: AppState): NavItem[] {
  if (role === 'admin') {
    return [
      { view: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { view: 'messages', icon: 'message', label: 'Chat' },
      { view: 'schedule', icon: 'schedule', label: 'Dienstplan' },
      { view: 'employees', icon: 'employees', label: 'Mitarbeiter' },
      { view: 'clock', icon: 'clock', label: 'Zeiterfassung' },
      { view: 'services', icon: 'checklist', label: 'Leistungen' },
      { view: 'absence', icon: 'absence', label: 'Abwesenheiten' },
      { view: 'location', icon: 'location', label: 'Standorte & Kunden' },
      { view: 'reports', icon: 'briefcase', label: 'Berichte' },
      { view: 'settings', icon: 'settings', label: 'Einstellungen' },
      { view: 'permissions', icon: 'bolt', label: 'Rollen & Berechtigungen' },
    ];
  }
  if (role === 'manager') {
    const items: NavItem[] = [
      { view: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { view: 'messages', icon: 'message', label: 'Chat' },
    ];
    const has = (id: string) => hasPerm(state, state.currentUserId, id);
    if (has('schedule_view')) items.push({ view: 'schedule', icon: 'schedule', label: 'Dienstplan' });
    if (has('emp_view')) items.push({ view: 'employees', icon: 'employees', label: 'Mitarbeiterübersicht' });
    if (has('time_view_own') || has('time_view_all')) items.push({ view: 'clock', icon: 'clock', label: 'Zeiterfassung' });
    if (has('services_manage')) items.push({ view: 'services', icon: 'checklist', label: 'Leistungen' });
    if (has('absence_view_own') || has('absence_view_all')) items.push({ view: 'absence', icon: 'absence', label: 'Abwesenheiten' });
    if (has('locations_view')) items.push({ view: 'location', icon: 'location', label: 'Standorte & Kunden' });
    if (has('reports_view')) items.push({ view: 'reports', icon: 'briefcase', label: 'Berichte' });
    return items;
  }
  return [
    { view: 'me-start', icon: 'dashboard', label: 'Start' },
    { view: 'me-schedule', icon: 'schedule', label: 'Mein Dienstplan' },
    { view: 'me-time', icon: 'clock', label: 'Zeiterfassung' },
    { view: 'me-hours', icon: 'hourglass', label: 'Meine Stunden' },
    { view: 'messages', icon: 'message', label: 'Chat' },
    { view: 'me-absence', icon: 'absence', label: 'Abwesenheiten' },
    { view: 'me-profile', icon: 'users2', label: 'Profil' },
  ];
}

/**
 * Rein präsentationelle Gruppierung der Hauptnavigation in wenige Kategorien (Personal, Planung,
 * Organisation). Ändert nichts an `navConfigFor` selbst: Eine Gruppe entsteht nur, wenn mindestens zwei
 * ihrer Ansichten für die aktuelle Rolle/Berechtigung bereits in `nav` enthalten sind — hat jemand nur
 * eine davon (z. B. ein Manager ohne Leistungen-Berechtigung), erscheint sie ganz normal als Einzelpunkt.
 * Mitarbeiter-Ansichten (me-*) tauchen in keiner Gruppe auf, ihre Navigation bleibt bewusst flach.
 */
export interface NavGroupDef {
  label: string;
  icon: IconName;
  views: ViewId[];
}

export const NAV_GROUPS: NavGroupDef[] = [
  { label: 'Personal', icon: 'employees', views: ['employees', 'services'] },
  { label: 'Planung', icon: 'schedule', views: ['schedule', 'absence'] },
  { label: 'Organisation', icon: 'location', views: ['location', 'settings', 'permissions'] },
];

export interface GroupedNavItem {
  key: string;
  label: string;
  icon: IconName;
  view?: ViewId;
  groupViews?: ViewId[];
}

export function groupNavItems(nav: NavItem[]): GroupedNavItem[] {
  const result: GroupedNavItem[] = [];
  const handledGroups = new Set<string>();
  nav.forEach((n) => {
    const group = NAV_GROUPS.find((g) => g.views.includes(n.view));
    if (group) {
      const presentViews = group.views.filter((v) => nav.some((x) => x.view === v));
      if (presentViews.length > 1) {
        if (handledGroups.has(group.label)) return;
        handledGroups.add(group.label);
        result.push({ key: group.label, label: group.label, icon: group.icon, groupViews: presentViews });
        return;
      }
    }
    result.push({ key: n.view, label: n.label, icon: n.icon, view: n.view });
  });
  return result;
}

export const VIEW_META: Record<ViewId, [string, string]> = {
  dashboard: ['Dashboard', 'Überblick über Personal, Einsätze und offene Aufgaben'],
  schedule: ['Dienstplan', 'Schichten planen und Mitarbeitenden zuweisen'],
  employees: ['Mitarbeiter', 'Personal verwalten und Standorten zuordnen'],
  clock: ['Zeiterfassung', 'Ein- und ausstempeln mit Standortabgleich'],
  messages: ['Chat', 'Direktnachrichten mit Admin, Manager und Mitarbeitenden'],
  services: ['Leistungen', 'Angebotene Leistungen anlegen, bearbeiten und deaktivieren'],
  absence: ['Abwesenheiten', 'Urlaub, Krankheit und Anträge verwalten'],
  location: ['Standorte & Kunden', 'Kunden, Objekte und Geofence-Radien pflegen'],
  reports: ['Berichte', 'Arbeitszeiten auswerten und exportieren'],
  settings: ['Einstellungen', 'Unternehmensangaben und Regeln festlegen'],
  permissions: ['Rollen & Berechtigungen', 'Festlegen, was Manager und Mitarbeitende dürfen'],
  'me-start': ['Start', 'Dein persönlicher Überblick für heute'],
  'me-schedule': ['Mein Dienstplan', 'Deine Schichten auf einen Blick'],
  'me-time': ['Zeiterfassung', 'Starte, pausiere und beende deine Arbeitszeit'],
  'me-hours': ['Meine Stunden', 'Deine gespeicherten Arbeitszeiten im Überblick'],
  'me-absence': ['Abwesenheiten', 'Deine Anträge und ihr Status'],
  'me-profile': ['Profil', 'Deine persönlichen Angaben'],
};
