import type { AppData, Customer, Employee, Shift, ShiftStatus, SystemRole, TimeEntry } from '../types';

export function getEmp(data: AppData, id: string | null | undefined): Employee | undefined {
  if (!id) return undefined;
  return data.employees.find((e) => e.id === id);
}

export function getCust(data: AppData, id: string | null | undefined) {
  if (!id) return undefined;
  return data.customers.find((c) => c.id === id);
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
