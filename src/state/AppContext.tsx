import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Absence,
  AbsenceStatus,
  AppData,
  Customer,
  CustomerIssue,
  Employee,
  FilterState,
  IssueSeverity,
  Shift,
  ShiftStatus,
  TimeCorrection,
  TimeEntry,
  ViewId,
} from '../types';
import { seedData } from '../data/seed';
import { DEFAULT_PERMISSIONS, roleLabel } from '../data/permissions';
import { uid } from '../utils/format';
import { isoDate } from '../utils/date';
import { currentRole, currentUser, hasPerm as hasPermSelector, isAdmin as isAdminSelector, openEntryFor } from './selectors';
import type { GeoFix } from '../hooks/useGeolocation';

const STORAGE_KEY = 'cleanflow-data';

export type ModalType =
  | 'clockin'
  | 'clockout'
  | 'shift'
  | 'employee'
  | 'absence'
  | 'customer'
  | 'meAbsence'
  | 'meCorrection'
  | 'meProfile';

export interface ModalState {
  type: ModalType;
  payload?: any;
}

export interface ToastItem {
  id: string;
  message: string;
}

export interface UIState {
  view: ViewId;
  loggedIn: boolean;
  currentUserId: string | null;
  currentEmployeeId: string | null;
  loginError: string;
  weekOffset: number;
  filter: FilterState;
  sidebarOpen: boolean;
  userMenuOpen: boolean;
  mobileDay: string;
  modal: ModalState | null;
  panelShiftId: string | null;
  panelLocationId: string | null;
  panelTimeEntryId: string | null;
}

export interface AppState extends AppData, UIState {}

/** Backfills fields introduced after data may already exist in localStorage, so older saved demo data doesn't break the UI. */
function migrateData(data: AppData): AppData {
  data.customers.forEach((c) => {
    if (c.geofenceEnabled === undefined) c.geofenceEnabled = true;
  });
  data.timeEntries.forEach((t) => {
    const anyT = t as any;
    if (t.geofenceRadius === undefined) t.geofenceRadius = 100;
    if (t.checkInLat === undefined) t.checkInLat = 0;
    if (t.checkInLng === undefined) t.checkInLng = 0;
    if (t.checkInAccuracy === undefined) t.checkInAccuracy = anyT.distance !== undefined ? 15 : 0;
    if (t.checkInDistance === undefined) t.checkInDistance = anyT.distance ?? 0;
    if (t.checkOutLat === undefined) t.checkOutLat = null;
    if (t.checkOutLng === undefined) t.checkOutLng = null;
    if (t.checkOutAccuracy === undefined) t.checkOutAccuracy = null;
    if (t.checkOutDistance === undefined) t.checkOutDistance = null;
    delete anyT.distance;
  });
  return data;
}

function loadInitialState(): AppState {
  let data: AppData | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) data = JSON.parse(raw) as AppData;
  } catch {
    data = null;
  }
  if (!data || !data.employees?.length) {
    data = seedData();
  } else {
    data = migrateData(data);
  }
  const admin = data.employees.find((e) => e.systemRole === 'admin');
  return {
    ...data,
    view: 'dashboard',
    loggedIn: false,
    currentUserId: admin?.id ?? data.employees[0]?.id ?? null,
    currentEmployeeId: data.employees[0]?.id ?? null,
    loginError: '',
    weekOffset: 0,
    filter: {},
    sidebarOpen: false,
    userMenuOpen: false,
    mobileDay: isoDate(new Date()),
    modal: null,
    panelShiftId: null,
    panelLocationId: null,
    panelTimeEntryId: null,
  };
}

function logChange(entry: TimeEntry, text: string, by: string): TimeEntry {
  return {
    ...entry,
    changeLog: [...entry.changeLog, { ts: new Date().toISOString(), text, by }],
  };
}

interface AppContextValue {
  state: AppState;
  toasts: ToastItem[];
  toast: (message: string) => void;
  actions: {
    // auth / nav
    attemptLogin: (employeeId: string, pin: string) => void;
    quickDemoLogin: (employeeId: string) => void;
    logout: () => void;
    setView: (view: ViewId) => void;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    toggleUserMenu: () => void;
    setUserMenuOpen: (open: boolean) => void;
    setFilter: (partial: FilterState) => void;
    setWeekOffset: (updater: number | ((prev: number) => number)) => void;
    setMobileDay: (day: string) => void;
    setCurrentEmployeeId: (id: string) => void;
    // modal / panels
    openModal: (type: ModalType, payload?: any) => void;
    closeModal: () => void;
    openShiftPanel: (id: string) => void;
    closeShiftPanel: () => void;
    openLocationPanel: (id: string) => void;
    closeLocationPanel: () => void;
    openTimeEntryPanel: (id: string) => void;
    closeTimeEntryPanel: () => void;
    // employees
    saveEmployee: (data: Omit<Employee, 'id' | 'customerIds'> & { customerIds: string[] }, id?: string | null) => void;
    deleteEmployee: (id: string) => void;
    toggleEmployeeStatus: (id: string) => void;
    // shifts
    saveShift: (data: Omit<Shift, 'id'>, id?: string | null) => void;
    deleteShift: (id: string) => void;
    duplicateShift: (id: string) => void;
    claimOpenShift: (id: string) => void;
    // absences
    saveAbsence: (data: Omit<Absence, 'id' | 'status'>) => void;
    setAbsStatus: (id: string, status: AbsenceStatus) => void;
    deleteAbsence: (id: string) => void;
    cancelMyAbsence: (id: string) => void;
    saveMeAbsence: (data: Omit<Absence, 'id' | 'employeeId' | 'status'>) => void;
    // time entries
    confirmClockIn: (employeeId: string, customerId: string, geo: GeoFix, distance: number, radius: number, geofenceOk: boolean) => void;
    confirmClockOut: (employeeId: string, geo: GeoFix, distance: number) => void;
    startPause: (employeeId: string) => void;
    endPause: (employeeId: string) => void;
    quickSetStatus: (entryId: string, status: TimeEntry['status']) => void;
    saveTimeEntryDetail: (
      entryId: string,
      updates: { start: string; end: string; pauseMinutes: number; notes: string; status: TimeEntry['status'] }
    ) => void;
    submitMeCorrection: (entryId: string, note: string) => void;
    resolveCorrection: (id: string, status: TimeCorrection['status']) => void;
    // customers
    saveCustomer: (data: Omit<Customer, 'id' | 'tasks' | 'issues'> & Partial<Pick<Customer, 'tasks' | 'issues'>>, id?: string | null) => void;
    deleteCustomer: (id: string) => void;
    toggleTask: (customerId: string, taskId: string) => void;
    addTask: (customerId: string, label: string) => void;
    removeTask: (customerId: string, taskId: string) => void;
    addIssue: (customerId: string, text: string, severity: IssueSeverity) => void;
    setIssueStatus: (customerId: string, issueId: string, status: CustomerIssue['status']) => void;
    removeIssue: (customerId: string, issueId: string) => void;
    // settings / permissions
    saveSettings: (updates: Partial<AppData['settings']>) => void;
    togglePermission: (role: 'manager' | 'mitarbeiter', permId: string) => void;
    toggleProfileField: (key: 'phone' | 'email') => void;
    resetPermissions: (role: 'manager' | 'mitarbeiter') => void;
    resetDemoData: () => void;
    // profile
    saveMeProfile: (updates: { phone?: string; email?: string }) => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `actions` below is memoized once (see the useMemo deps at its end), so any action that
  // needs the *current* state outside of a setState updater must read it from this ref
  // instead of closing over the `state` variable directly (which would stay stuck at its
  // value from the first render).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const persistable: AppData = {
        employees: state.employees,
        customers: state.customers,
        shifts: state.shifts,
        absences: state.absences,
        timeEntries: state.timeEntries,
        timeCorrections: state.timeCorrections,
        settings: state.settings,
        permissions: state.permissions,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
      } catch {
        /* ignore quota errors in demo mode */
      }
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const toast = useCallback((message: string) => {
    const id = uid();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  const actingEmployeeId = useCallback(
    (s: AppState) => (currentRole(s, s.currentUserId) === 'mitarbeiter' ? s.currentUserId : s.currentEmployeeId),
    []
  );

  const actions = useMemo<AppContextValue['actions']>(
    () => ({
      attemptLogin: (employeeId, pin) => {
        setState((s) => {
          const emp = s.employees.find((e) => e.id === employeeId);
          if (!emp || emp.status !== 'aktiv') {
            return { ...s, loginError: 'Bitte ein gültiges Konto auswählen.' };
          }
          if (!pin || pin !== emp.pin) {
            return { ...s, loginError: 'PIN ist nicht korrekt. Bitte erneut versuchen.' };
          }
          return {
            ...s,
            currentUserId: emp.id,
            loggedIn: true,
            view: emp.systemRole === 'mitarbeiter' ? 'me-start' : 'dashboard',
            sidebarOpen: false,
            userMenuOpen: false,
            loginError: '',
            modal: null,
            panelShiftId: null,
            panelLocationId: null,
            panelTimeEntryId: null,
          };
        });
      },
      quickDemoLogin: (employeeId) => {
        setState((s) => {
          const emp = s.employees.find((e) => e.id === employeeId);
          if (!emp) return s;
          return {
            ...s,
            currentUserId: emp.id,
            loggedIn: true,
            view: emp.systemRole === 'mitarbeiter' ? 'me-start' : 'dashboard',
            sidebarOpen: false,
            userMenuOpen: false,
            loginError: '',
            modal: null,
            panelShiftId: null,
            panelLocationId: null,
            panelTimeEntryId: null,
          };
        });
        setTimeout(() => {
          const emp = stateRef.current.employees.find((e) => e.id === employeeId);
          if (emp) toast(`Angemeldet als ${emp.name}`);
        }, 0);
      },
      logout: () => {
        setState((s) => ({
          ...s,
          loggedIn: false,
          userMenuOpen: false,
          modal: null,
          panelShiftId: null,
          panelLocationId: null,
          panelTimeEntryId: null,
        }));
      },
      setView: (view) => setState((s) => ({ ...s, view, sidebarOpen: false })),
      toggleSidebar: () => setState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => setState((s) => ({ ...s, sidebarOpen: open })),
      toggleUserMenu: () => setState((s) => ({ ...s, userMenuOpen: !s.userMenuOpen })),
      setUserMenuOpen: (open) => setState((s) => ({ ...s, userMenuOpen: open })),
      setFilter: (partial) => setState((s) => ({ ...s, filter: { ...s.filter, ...partial } })),
      setWeekOffset: (updater) =>
        setState((s) => ({
          ...s,
          weekOffset: typeof updater === 'function' ? (updater as (p: number) => number)(s.weekOffset) : updater,
        })),
      setMobileDay: (day) => setState((s) => ({ ...s, mobileDay: day })),
      setCurrentEmployeeId: (id) => setState((s) => ({ ...s, currentEmployeeId: id })),

      openModal: (type, payload) => setState((s) => ({ ...s, modal: { type, payload } })),
      closeModal: () => setState((s) => ({ ...s, modal: null })),
      openShiftPanel: (id) => setState((s) => ({ ...s, panelShiftId: id })),
      closeShiftPanel: () => setState((s) => ({ ...s, panelShiftId: null })),
      openLocationPanel: (id) => setState((s) => ({ ...s, panelLocationId: id })),
      closeLocationPanel: () => setState((s) => ({ ...s, panelLocationId: null })),
      openTimeEntryPanel: (id) => setState((s) => ({ ...s, panelTimeEntryId: id })),
      closeTimeEntryPanel: () => setState((s) => ({ ...s, panelTimeEntryId: null })),

      saveEmployee: (data, id) => {
        setState((s) => {
          if (id) {
            return {
              ...s,
              employees: s.employees.map((e) => (e.id === id ? { ...e, ...data } : e)),
            };
          }
          const emp: Employee = { id: uid(), ...data };
          return {
            ...s,
            employees: [...s.employees, emp],
            currentEmployeeId: s.currentEmployeeId ?? emp.id,
          };
        });
        toast(id ? 'Mitarbeiter aktualisiert.' : 'Mitarbeiter angelegt und verknüpft.');
      },
      deleteEmployee: (id) => {
        if (!window.confirm('Diesen Mitarbeiter wirklich löschen?')) return;
        setState((s) => ({ ...s, employees: s.employees.filter((e) => e.id !== id) }));
        toast('Mitarbeiter gelöscht.');
      },
      toggleEmployeeStatus: (id) => {
        let nowActive = true;
        setState((s) => ({
          ...s,
          employees: s.employees.map((e) => {
            if (e.id !== id) return e;
            const status = e.status === 'aktiv' ? 'inaktiv' : 'aktiv';
            nowActive = status === 'aktiv';
            return { ...e, status };
          }),
        }));
        setTimeout(() => toast(nowActive ? 'Mitarbeiter aktiviert.' : 'Mitarbeiter deaktiviert.'), 0);
      },

      saveShift: (data, id) => {
        setState((s) => {
          if (id) {
            return { ...s, shifts: s.shifts.map((sh) => (sh.id === id ? { ...sh, ...data } : sh)) };
          }
          return { ...s, shifts: [...s.shifts, { id: uid(), ...data }] };
        });
        toast(id ? 'Schicht aktualisiert.' : 'Schicht hinzugefügt.');
      },
      deleteShift: (id) => {
        if (!window.confirm('Diese Schicht wirklich löschen?')) return;
        setState((s) => ({ ...s, shifts: s.shifts.filter((sh) => sh.id !== id), panelShiftId: null, modal: null }));
        toast('Schicht gelöscht.');
      },
      duplicateShift: (id) => {
        setState((s) => {
          const sh = s.shifts.find((x) => x.id === id);
          if (!sh) return s;
          return { ...s, shifts: [...s.shifts, { ...sh, id: uid() }], panelShiftId: null };
        });
        toast('Schicht dupliziert.');
      },
      claimOpenShift: (id) => {
        setState((s) => ({
          ...s,
          shifts: s.shifts.map((sh) =>
            sh.id === id && !sh.employeeId ? { ...sh, employeeId: s.currentUserId, status: 'bestätigt' as ShiftStatus } : sh
          ),
        }));
        toast('Schicht übernommen.');
      },

      saveAbsence: (data) => {
        setState((s) => ({ ...s, absences: [...s.absences, { id: uid(), ...data, status: 'beantragt' }] }));
        toast('Antrag erfasst.');
      },
      setAbsStatus: (id, status) => {
        setState((s) => ({ ...s, absences: s.absences.map((a) => (a.id === id ? { ...a, status } : a)) }));
        toast(status === 'genehmigt' ? 'Antrag genehmigt.' : 'Antrag abgelehnt.');
      },
      deleteAbsence: (id) => {
        setState((s) => ({ ...s, absences: s.absences.filter((a) => a.id !== id) }));
      },
      cancelMyAbsence: (id) => {
        setState((s) => ({ ...s, absences: s.absences.filter((a) => a.id !== id) }));
        toast('Antrag zurückgezogen.');
      },
      saveMeAbsence: (data) => {
        setState((s) => ({
          ...s,
          absences: [...s.absences, { id: uid(), employeeId: s.currentUserId as string, ...data, status: 'beantragt' }],
        }));
        toast('Antrag eingereicht.');
      },

      confirmClockIn: (employeeId, customerId, geo, distance, radius, geofenceOk) => {
        const now = new Date().toISOString();
        setState((s) => ({
          ...s,
          timeEntries: [
            ...s.timeEntries,
            {
              id: uid(),
              employeeId,
              customerId,
              clockIn: now,
              clockOut: null,
              geofenceOk,
              geofenceRadius: radius,
              checkInLat: geo.lat,
              checkInLng: geo.lng,
              checkInAccuracy: geo.accuracy,
              checkInDistance: distance,
              checkOutLat: null,
              checkOutLng: null,
              checkOutAccuracy: null,
              checkOutDistance: null,
              pauseMinutes: 0,
              pauseStart: null,
              status: 'offen',
              notes: '',
              createdAt: now,
              updatedAt: now,
              changeLog: [],
            },
          ],
          modal: null,
        }));
        toast('Erfolgreich eingestempelt.');
      },
      confirmClockOut: (employeeId, geo, distance) => {
        setState((s) => ({
          ...s,
          timeEntries: s.timeEntries.map((t) => {
            if (t.employeeId !== employeeId || t.clockOut) return t;
            let pauseMinutes = t.pauseMinutes;
            if (t.pauseStart) {
              pauseMinutes += Math.round((Date.now() - new Date(t.pauseStart).getTime()) / 60000);
            }
            return {
              ...t,
              clockOut: new Date().toISOString(),
              checkOutLat: geo.lat,
              checkOutLng: geo.lng,
              checkOutAccuracy: geo.accuracy,
              checkOutDistance: distance,
              pauseStart: null,
              pauseMinutes,
              status: 'offen',
              updatedAt: new Date().toISOString(),
            };
          }),
          modal: null,
        }));
        toast('Erfolgreich ausgestempelt.');
      },
      startPause: (employeeId) => {
        setState((s) => ({
          ...s,
          timeEntries: s.timeEntries.map((t) =>
            t.employeeId === employeeId && !t.clockOut ? { ...t, pauseStart: new Date().toISOString(), updatedAt: new Date().toISOString() } : t
          ),
        }));
        toast('Pause gestartet.');
      },
      endPause: (employeeId) => {
        let mins = 0;
        setState((s) => ({
          ...s,
          timeEntries: s.timeEntries.map((t) => {
            if (t.employeeId !== employeeId || t.clockOut || !t.pauseStart) return t;
            mins = Math.round((Date.now() - new Date(t.pauseStart).getTime()) / 60000);
            return { ...t, pauseMinutes: t.pauseMinutes + mins, pauseStart: null, updatedAt: new Date().toISOString() };
          }),
        }));
        setTimeout(() => toast(`Pause beendet (${mins} Min.).`), 0);
      },
      quickSetStatus: (entryId, status) => {
        setState((s) => {
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          return {
            ...s,
            timeEntries: s.timeEntries.map((t) => {
              if (t.id !== entryId) return t;
              const updated = logChange(t, `Status wurde von "${statusLabel(t.status)}" auf "${statusLabel(status)}" gesetzt.`, by);
              return { ...updated, status, updatedAt: new Date().toISOString() };
            }),
          };
        });
        toast('Status aktualisiert.');
      },
      saveTimeEntryDetail: (entryId, updates) => {
        setState((s) => {
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          return {
            ...s,
            timeEntries: s.timeEntries.map((t) => {
              if (t.id !== entryId) return t;
              let next = t;
              const day = isoDate(new Date(t.clockIn));
              const oldStartLabel = new Date(t.clockIn).toTimeString().slice(0, 5);
              const oldEndLabel = t.clockOut ? new Date(t.clockOut).toTimeString().slice(0, 5) : '–';
              if (updates.start && updates.start !== oldStartLabel) {
                next = logChange(next, `Startzeit wurde von ${oldStartLabel} auf ${updates.start} geändert.`, by);
                next = { ...next, clockIn: new Date(`${day}T${updates.start}:00`).toISOString() };
              }
              if (updates.end && updates.end !== oldEndLabel) {
                next = logChange(next, `Endzeit wurde von ${oldEndLabel} auf ${updates.end} geändert.`, by);
                next = { ...next, clockOut: new Date(`${day}T${updates.end}:00`).toISOString() };
              }
              if (updates.pauseMinutes !== t.pauseMinutes) {
                next = logChange(next, `Pause wurde von ${t.pauseMinutes} Min. auf ${updates.pauseMinutes} Min. geändert.`, by);
                next = { ...next, pauseMinutes: updates.pauseMinutes };
              }
              if (updates.notes !== t.notes) {
                next = logChange(next, updates.notes ? `Notiz ergänzt: "${updates.notes}"` : 'Notiz entfernt.', by);
                next = { ...next, notes: updates.notes };
              }
              if (updates.status !== t.status) {
                next = logChange(next, `Status wurde von "${statusLabel(t.status)}" auf "${statusLabel(updates.status)}" gesetzt.`, by);
                next = { ...next, status: updates.status };
              }
              return { ...next, updatedAt: new Date().toISOString() };
            }),
          };
        });
        toast('Zeiteintrag aktualisiert.');
      },
      submitMeCorrection: (entryId, note) => {
        setState((s) => ({
          ...s,
          timeCorrections: [
            ...s.timeCorrections,
            { id: uid(), employeeId: s.currentUserId as string, entryId, note, status: 'offen', date: isoDate(new Date()) },
          ],
          modal: null,
        }));
        toast('Korrekturanfrage gesendet.');
      },
      resolveCorrection: (id, status) => {
        setState((s) => ({ ...s, timeCorrections: s.timeCorrections.map((c) => (c.id === id ? { ...c, status } : c)) }));
        toast('Korrekturanfrage aktualisiert.');
      },

      saveCustomer: (data, id) => {
        setState((s) => {
          if (id) {
            return { ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, ...data } : c)) };
          }
          const cust: Customer = { id: uid(), ...data, tasks: data.tasks || [], issues: data.issues || [] };
          return { ...s, customers: [...s.customers, cust] };
        });
        toast(id ? 'Standort aktualisiert.' : 'Standort angelegt.');
      },
      deleteCustomer: (id) => {
        if (!window.confirm('Diesen Standort wirklich löschen?')) return;
        setState((s) => ({
          ...s,
          customers: s.customers.filter((c) => c.id !== id),
          employees: s.employees.map((e) => ({ ...e, customerIds: e.customerIds.filter((cid) => cid !== id) })),
          panelLocationId: null,
        }));
        toast('Standort gelöscht.');
      },
      toggleTask: (customerId, taskId) => {
        setState((s) => ({
          ...s,
          customers: s.customers.map((c) =>
            c.id === customerId ? { ...c, tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) } : c
          ),
        }));
      },
      addTask: (customerId, label) => {
        if (!label.trim()) return;
        setState((s) => ({
          ...s,
          customers: s.customers.map((c) =>
            c.id === customerId ? { ...c, tasks: [...c.tasks, { id: uid(), label: label.trim(), done: false }] } : c
          ),
        }));
      },
      removeTask: (customerId, taskId) => {
        setState((s) => ({
          ...s,
          customers: s.customers.map((c) => (c.id === customerId ? { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) } : c)),
        }));
      },
      addIssue: (customerId, text, severity) => {
        if (!text.trim()) return;
        setState((s) => ({
          ...s,
          customers: s.customers.map((c) =>
            c.id === customerId
              ? { ...c, issues: [...c.issues, { id: uid(), date: isoDate(new Date()), text: text.trim(), status: 'offen', severity }] }
              : c
          ),
        }));
        toast('Mängelmeldung erfasst.');
      },
      setIssueStatus: (customerId, issueId, status) => {
        setState((s) => ({
          ...s,
          customers: s.customers.map((c) =>
            c.id === customerId ? { ...c, issues: c.issues.map((i) => (i.id === issueId ? { ...i, status } : i)) } : c
          ),
        }));
      },
      removeIssue: (customerId, issueId) => {
        setState((s) => ({
          ...s,
          customers: s.customers.map((c) => (c.id === customerId ? { ...c, issues: c.issues.filter((i) => i.id !== issueId) } : c)),
        }));
      },

      saveSettings: (updates) => {
        setState((s) => ({ ...s, settings: { ...s.settings, ...updates } }));
        toast('Einstellungen gespeichert.');
      },
      togglePermission: (role, permId) => {
        setState((s) => {
          if (!isAdminSelector(s, s.currentUserId)) return s;
          return { ...s, permissions: { ...s.permissions, [role]: { ...s.permissions[role], [permId]: !s.permissions[role][permId] } } };
        });
      },
      toggleProfileField: (key) => {
        setState((s) => {
          if (!isAdminSelector(s, s.currentUserId)) return s;
          return { ...s, settings: { ...s.settings, profileEditableFields: { ...s.settings.profileEditableFields, [key]: !s.settings.profileEditableFields[key] } } };
        });
      },
      resetPermissions: (role) => {
        if (!window.confirm(`Berechtigungen für ${roleLabel(role)} auf Standard zurücksetzen?`)) return;
        setState((s) => ({ ...s, permissions: { ...s.permissions, [role]: { ...DEFAULT_PERMISSIONS[role] } } }));
        toast('Auf Standard zurückgesetzt.');
      },
      resetDemoData: () => {
        if (!window.confirm('Wirklich alle Daten auf die Demo-Ausgangslage zurücksetzen?')) return;
        setState((s) => {
          const fresh = seedData();
          const admin = fresh.employees.find((e) => e.systemRole === 'admin');
          return {
            ...s,
            ...fresh,
            currentEmployeeId: fresh.employees[0]?.id ?? null,
            currentUserId: admin?.id ?? null,
            view: 'dashboard',
          };
        });
        toast('Demo-Daten wurden zurückgesetzt.');
      },
      saveMeProfile: (updates) => {
        setState((s) => ({
          ...s,
          employees: s.employees.map((e) => {
            if (e.id !== s.currentUserId) return e;
            const fields = s.settings.profileEditableFields;
            return {
              ...e,
              phone: fields.phone && updates.phone !== undefined ? updates.phone : e.phone,
              email: fields.email && updates.email !== undefined ? updates.email : e.email,
            };
          }),
          modal: null,
        }));
        toast('Profil aktualisiert.');
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast]
  );

  const value: AppContextValue = { state, toasts, toast, actions };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function statusLabel(s: string): string {
  return ({ offen: 'Offen', bestätigt: 'Bestätigt', korrigiert: 'Korrigiert' } as Record<string, string>)[s] || s;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useActingEmployeeId(): string | null {
  const { state } = useApp();
  return currentRole(state, state.currentUserId) === 'mitarbeiter' ? state.currentUserId : state.currentEmployeeId;
}

export function useCurrentUser(): Employee | undefined {
  const { state } = useApp();
  return currentUser(state, state.currentUserId);
}

export function useCurrentRole() {
  const { state } = useApp();
  return currentRole(state, state.currentUserId);
}

export function useIsAdmin() {
  const { state } = useApp();
  return isAdminSelector(state, state.currentUserId);
}

export function useHasPerm() {
  const { state } = useApp();
  return (permId: string) => hasPermSelector(state, state.currentUserId, permId);
}

export function useOpenEntryFor(employeeId: string | null | undefined) {
  const { state } = useApp();
  return openEntryFor(state, employeeId);
}
