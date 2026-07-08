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
      { view: 'schedule', icon: 'schedule', label: 'Dienstplan' },
      { view: 'employees', icon: 'employees', label: 'Mitarbeiter' },
      { view: 'clock', icon: 'clock', label: 'Zeiterfassung' },
      { view: 'absence', icon: 'absence', label: 'Abwesenheiten' },
      { view: 'location', icon: 'location', label: 'Standorte & Kunden' },
      { view: 'reports', icon: 'briefcase', label: 'Berichte' },
      { view: 'settings', icon: 'settings', label: 'Einstellungen' },
      { view: 'permissions', icon: 'bolt', label: 'Rollen & Berechtigungen' },
    ];
  }
  if (role === 'manager') {
    const items: NavItem[] = [{ view: 'dashboard', icon: 'dashboard', label: 'Dashboard' }];
    const has = (id: string) => hasPerm(state, state.currentUserId, id);
    if (has('schedule_view')) items.push({ view: 'schedule', icon: 'schedule', label: 'Dienstplan' });
    if (has('emp_view')) items.push({ view: 'employees', icon: 'employees', label: 'Mitarbeiterübersicht' });
    if (has('time_view_own') || has('time_view_all')) items.push({ view: 'clock', icon: 'clock', label: 'Zeiterfassung' });
    if (has('absence_view_own') || has('absence_view_all')) items.push({ view: 'absence', icon: 'absence', label: 'Abwesenheiten' });
    if (has('locations_view')) items.push({ view: 'location', icon: 'location', label: 'Standorte & Kunden' });
    if (has('reports_view')) items.push({ view: 'reports', icon: 'briefcase', label: 'Berichte' });
    return items;
  }
  return [
    { view: 'me-start', icon: 'dashboard', label: 'Start' },
    { view: 'me-schedule', icon: 'schedule', label: 'Mein Dienstplan' },
    { view: 'me-time', icon: 'clock', label: 'Zeiterfassung' },
    { view: 'me-absence', icon: 'absence', label: 'Abwesenheiten' },
    { view: 'me-profile', icon: 'users2', label: 'Profil' },
  ];
}

export const VIEW_META: Record<ViewId, [string, string]> = {
  dashboard: ['Dashboard', 'Überblick über Personal, Einsätze und offene Aufgaben'],
  schedule: ['Dienstplan', 'Schichten planen und Mitarbeitenden zuweisen'],
  employees: ['Mitarbeiter', 'Personal verwalten und Standorten zuordnen'],
  clock: ['Zeiterfassung', 'Ein- und ausstempeln mit Standortabgleich'],
  absence: ['Abwesenheiten', 'Urlaub, Krankheit und Anträge verwalten'],
  location: ['Standorte & Kunden', 'Kunden, Objekte und Geofence-Radien pflegen'],
  reports: ['Berichte', 'Arbeitszeiten auswerten und exportieren'],
  settings: ['Einstellungen', 'Unternehmensangaben und Regeln festlegen'],
  permissions: ['Rollen & Berechtigungen', 'Festlegen, was Manager und Mitarbeitende dürfen'],
  'me-start': ['Start', 'Dein persönlicher Überblick für heute'],
  'me-schedule': ['Mein Dienstplan', 'Deine Schichten auf einen Blick'],
  'me-time': ['Zeiterfassung', 'Starte, pausiere und beende deine Arbeitszeit'],
  'me-absence': ['Abwesenheiten', 'Deine Anträge und ihr Status'],
  'me-profile': ['Profil', 'Deine persönlichen Angaben'],
};
