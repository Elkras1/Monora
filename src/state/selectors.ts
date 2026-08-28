import type { AppData, Absence, Customer, Employee, MaterialRequest, Service, Shift, ShiftStatus, SystemRole, Ticket, TimeEntry } from '../types';
import { fmtDateShort } from '../utils/date';

export function getEmp(data: AppData, id: string | null | undefined): Employee | undefined {
  if (!id) return undefined;
  return data.employees.find((e) => e.id === id);
}

export function getCust(data: AppData, id: string | null | undefined) {
  if (!id) return undefined;
  return data.customers.find((c) => c.id === id);
}

export function getService(data: AppData, id: string | null | undefined): Service | undefined {
  if (!id) return undefined;
  return data.services.find((s) => s.id === id);
}

export function openEntryFor(data: AppData, employeeId: string | null | undefined): TimeEntry | undefined {
  if (!employeeId) return undefined;
  return data.timeEntries.find((t) => t.employeeId === employeeId && !t.clockOut);
}

/** Reinigungsobjekte, die ein Mitarbeiter beim Einstempeln zur Auswahl bekommt (zugewiesene, sonst alle aktiven). */
export function eligibleCustomersFor(data: AppData, employee: Employee | undefined): Customer[] {
  if (!employee) return [];
  const assigned = data.customers.filter((c) => employee.customerIds.includes(c.id) && c.active);
  return assigned.length ? assigned : data.customers.filter((c) => c.active);
}

export function currentUser(data: AppData, currentUserId: string | null): Employee | undefined {
  return getEmp(data, currentUserId) || data.employees.find((e) => e.systemRole === 'admin');
}

export function currentRole(data: AppData, currentUserId: string | null): SystemRole {
  const u = currentUser(data, currentUserId);
  return u ? u.systemRole : 'admin';
}

export function isAdmin(data: AppData, currentUserId: string | null): boolean {
  return currentRole(data, currentUserId) === 'admin';
}

export function hasPerm(data: AppData, currentUserId: string | null, permId: string): boolean {
  const role = currentRole(data, currentUserId);
  if (role === 'admin') return true;
  if (role === 'manager' || role === 'mitarbeiter') {
    return !!data.permissions[role]?.[permId];
  }
  return false;
}

function timeOverlap(a: Shift, b: Shift): boolean {
  return a.start < b.end && b.start < a.end;
}

export function computeConflictIds(shifts: Shift[]): Set<string> {
  const map: Record<string, Shift[]> = {};
  shifts.forEach((s) => {
    if (!s.employeeId) return;
    const key = `${s.employeeId}|${s.date}`;
    (map[key] = map[key] || []).push(s);
  });
  const ids = new Set<string>();
  Object.values(map).forEach((arr) => {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (timeOverlap(arr[i], arr[j])) {
          ids.add(arr[i].id);
          ids.add(arr[j].id);
        }
      }
    }
  });
  return ids;
}

export function shiftDisplayStatus(shift: Shift, conflictIds: Set<string>): ShiftStatus | 'konflikt' {
  return conflictIds.has(shift.id) ? 'konflikt' : shift.status;
}

/** Prozentualer Ausfall einer Abwesenheit; ältere Datensätze ohne das Feld gelten als 100 %. */
export function getAbsencePercentage(absence: Absence): number {
  return absence.absencePercentage ?? 100;
}

/** Genehmigte Abwesenheiten eines Mitarbeiters, die einen bestimmten Tag abdecken (z.B. für Hinweise im Dienstplan). */
export function absencesOnDate(data: AppData, employeeId: string, iso: string): Absence[] {
  return data.absences.filter((a) => a.employeeId === employeeId && a.status === 'genehmigt' && a.start <= iso && a.end >= iso);
}

export type TicketUrgency = 'normal' | 'soon' | 'today' | 'overdue' | 'done';

/** Dringlichkeit eines Tickets nach Fälligkeitsdatum — für die dezente Farbfläche in Dashboard und
 * Ticketliste (siehe ticketUrgencyRowClass in components/ui/Badge.tsx). Erledigte/abgeschlossene Tickets
 * bekommen die eigene Kategorie "done" (dezentes Grün), unabhängig vom ursprünglichen Fälligkeitsdatum. */
export function ticketUrgency(ticket: Ticket, todayIso: string, tomorrowIso: string): TicketUrgency {
  if (ticket.status === 'erledigt') return 'done';
  if (!ticket.dueDate) return 'normal';
  if (ticket.dueDate < todayIso) return 'overdue';
  if (ticket.dueDate === todayIso) return 'today';
  if (ticket.dueDate === tomorrowIso) return 'soon';
  return 'normal';
}

export function ticketDaysOverdue(dueIso: string, todayIso: string): number {
  return Math.round((new Date(todayIso).getTime() - new Date(dueIso).getTime()) / 86400000);
}

/** Materialanfragen-Pendant zu ticketUrgency: nutzt requestedDate als optionales Fälligkeitsdatum (vom
 * Mitarbeiter nie gesetzt, nur Admin/Manager weisen es beim Bearbeiten optional zu, siehe
 * MaterialRequestModal.tsx) — dieselbe Farblogik wie bei Tickets, ohne Fälligkeitsdatum gilt eine Anfrage
 * einfach als normal offen. */
export function materialUrgency(req: MaterialRequest, todayIso: string, tomorrowIso: string): TicketUrgency {
  if (req.status === 'erledigt') return 'done';
  if (!req.requestedDate) return 'normal';
  if (req.requestedDate < todayIso) return 'overdue';
  if (req.requestedDate === todayIso) return 'today';
  if (req.requestedDate === tomorrowIso) return 'soon';
  return 'normal';
}

/** Sortierrang für Dashboard-To-do-Listen (Tickets UND Materialanfragen, siehe DashboardWorkList.tsx):
 * überfällig < heute < morgen < später < ohne Fälligkeitsdatum. "Später" und "ohne Datum" teilen sich zwar
 * dieselbe Farbe (siehe ticketUrgency/materialUrgency: beide "normal"), werden hier aber bewusst getrennt
 * einsortiert — ein Eintrag ohne Datum soll nicht vor einem mit fernem, aber bekanntem Datum stehen. */
export function dueRank(dateIso: string | null | undefined, todayIso: string, tomorrowIso: string): number {
  if (!dateIso) return 4;
  if (dateIso < todayIso) return 0;
  if (dateIso === todayIso) return 1;
  if (dateIso === tomorrowIso) return 2;
  return 3;
}

/** Kompakte, dezente Datums-/Statuszeile für Dashboard-To-do-Listen — identisch für Tickets und
 * Materialanfragen (siehe DashboardWorkList.tsx), damit beide Bereiche optisch/inhaltlich gleich wirken.
 * Ohne Datum bewusst "Offen" statt leer, damit die Zeile nie “springt”. */
export function dueLabel(dateIso: string | null | undefined, todayIso: string, tomorrowIso: string): string {
  if (!dateIso) return 'Offen';
  if (dateIso < todayIso) {
    const days = ticketDaysOverdue(dateIso, todayIso);
    return `${days} Tag${days === 1 ? '' : 'e'} überfällig`;
  }
  if (dateIso === todayIso) return 'Heute';
  if (dateIso === tomorrowIso) return 'Morgen';
  return `Fällig ${fmtDateShort(new Date(dateIso))}`;
}

/** Ob ein Ticket automatisch im Dashboard-Kalender erscheinen soll (siehe DashboardCalendar.tsx). Braucht
 * ein Fälligkeitsdatum, sonst gibt es keinen Tag, an dem es angezeigt werden könnte. `showInCalendar` ist
 * `undefined` bei Alt-Tickets/ohne bewusste Abwahl — das gilt als "an"; nur eine explizite Deaktivierung
 * (false) blendet ein fälliges Ticket aus. */
export function ticketShowsInCalendar(ticket: Ticket): boolean {
  return !!ticket.dueDate && ticket.showInCalendar !== false;
}

/** Andere Mitarbeitende, die am selben Tag am selben Objekt eingeteilt sind ("Team" einer Schicht). */
export function teammatesFor(data: AppData, shift: Shift): Employee[] {
  const ids = new Set<string>();
  const team: Employee[] = [];
  data.shifts.forEach((s) => {
    if (s.id === shift.id || !s.employeeId) return;
    if (s.customerId !== shift.customerId || s.date !== shift.date) return;
    if (s.employeeId === shift.employeeId || ids.has(s.employeeId)) return;
    const emp = getEmp(data, s.employeeId);
    if (emp) {
      ids.add(emp.id);
      team.push(emp);
    }
  });
  return team;
}
