import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Absence,
  AbsenceStatus,
  AppData,
  AppNotification,
  ChatMessage,
  Customer,
  CustomerIssue,
  CustomFieldDef,
  Employee,
  EmployeeDocumentMeta,
  FilterState,
  IssueSeverity,
  Material,
  MaterialRequest,
  MaterialRequestItem,
  MaterialRequestStatus,
  MessageAttachmentMeta,
  NotificationType,
  Service,
  Shift,
  ShiftStatus,
  Ticket,
  TicketAttachmentMeta,
  TicketPriority,
  TicketStatus,
  TimeCorrection,
  TimeEntry,
  ViewId,
} from '../types';
import { seedData } from '../data/seed';
import { DEFAULT_PERMISSIONS, roleLabel } from '../data/permissions';
import { makeDefaultServices } from '../data/services';
import { makeChatId } from './chat';
import { uid } from '../utils/format';
import { addDays, isoDate } from '../utils/date';
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
  | 'service'
  | 'meAbsence'
  | 'meCorrection'
  | 'meProfile'
  | 'meChangePassword'
  | 'ticket'
  | 'materialRequest';

export interface ModalState {
  type: ModalType;
  payload?: any;
}

export interface ToastItem {
  id: string;
  message: string;
}

/**
 * Demo-Passwort-Reset-Token (Prototyp only): rein clientseitig, lebt nur im Speicher dieser Browser-
 * Sitzung (kein Persistieren in localStorage). `employeeId` ist absichtlich `null`, wenn die eingegebene
 * E-Mail zu keinem Konto passt — die UI zeigt in beiden Fällen dieselbe neutrale Meldung, damit nicht
 * erkennbar ist, ob ein Konto existiert (siehe requestPasswordReset/resetPassword unten).
 * Bei einer echten Supabase-Auth-Anbindung entfällt das komplett zugunsten von
 * supabase.auth.resetPasswordForEmail()/updateUser() mit serverseitig signierten Tokens.
 */
export interface PasswordResetToken {
  token: string;
  employeeId: string | null;
  email: string;
}

export interface UIState {
  view: ViewId;
  loggedIn: boolean;
  currentUserId: string | null;
  currentEmployeeId: string | null;
  loginError: string;
  authView: 'login' | 'forgot' | 'reset';
  passwordResetToken: PasswordResetToken | null;
  weekOffset: number;
  filter: FilterState;
  sidebarOpen: boolean;
  userMenuOpen: boolean;
  mobileDay: string;
  modal: ModalState | null;
  panelShiftId: string | null;
  panelLocationId: string | null;
  panelTimeEntryId: string | null;
  panelLiveStatusId: string | null;
  panelMyShiftId: string | null;
  panelTicketId: string | null;
  panelMaterialRequestId: string | null;
}

export interface AppState extends AppData, UIState {}

/** Backfills fields introduced after data may already exist in localStorage, so older saved demo data doesn't break the UI. */
function migrateData(data: AppData): AppData {
  data.customers.forEach((c) => {
    if (c.geofenceEnabled === undefined) c.geofenceEnabled = true;
  });
  data.employees.forEach((e) => {
    // PROTOTYP-HINWEIS: Passwörter liegen hier bewusst einfach als Klartext-Feld im zentralen State/
    // localStorage, es gibt keine Hash-/Salt-Bildung. Das ist NICHT produktionstauglich und dient nur
    // der Demo. Bei einer echten Supabase-Auth-Anbindung entfällt dieses Feld vollständig — Passwörter
    // würden dann ausschliesslich serverseitig von Supabase gehasht verwaltet, niemals im Client-State.
    if (e.password === undefined) e.password = 'demo1234';
    // Login lief früher über den Namen; die drei Demo-Konten bekommen jetzt feste E-Mail-Logins,
    // auch wenn in localStorage noch eine ältere Demo-Domain hinterlegt ist.
    if (e.name === 'Laura Keller' && e.systemRole === 'admin') e.email = 'admin@planico.ch';
    if (e.name === 'Marco Baumann' && e.systemRole === 'manager') e.email = 'manager@planico.ch';
    if (e.name === 'Luca Meier' && e.systemRole === 'mitarbeiter') e.email = 'mitarbeiter@planico.ch';
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
    if (t.serviceId === undefined) t.serviceId = null;
    delete anyT.distance;
  });
  if (data.permissions.manager.time_export === undefined) data.permissions.manager.time_export = true;
  if (data.permissions.mitarbeiter.time_export === undefined) data.permissions.mitarbeiter.time_export = false;
  if (data.permissions.manager.services_manage === undefined) data.permissions.manager.services_manage = true;
  if (data.permissions.mitarbeiter.services_manage === undefined) data.permissions.mitarbeiter.services_manage = false;
  if (!data.services || !data.services.length) data.services = makeDefaultServices();
  data.shifts.forEach((sh) => {
    if ((sh as any).serviceId === undefined) sh.serviceId = null;
  });
  if (!data.customFieldDefs) data.customFieldDefs = [];
  data.employees.forEach((e) => {
    if (e.serviceIds === undefined) e.serviceIds = [];
    if (e.customFieldValues === undefined) e.customFieldValues = {};
    if (e.documents === undefined) e.documents = [];
  });
  if (data.permissions.manager.emp_view_sensitive === undefined) data.permissions.manager.emp_view_sensitive = false;
  if (data.permissions.mitarbeiter.emp_view_sensitive === undefined) data.permissions.mitarbeiter.emp_view_sensitive = false;
  if (data.permissions.manager.emp_edit_sensitive === undefined) data.permissions.manager.emp_edit_sensitive = false;
  if (data.permissions.mitarbeiter.emp_edit_sensitive === undefined) data.permissions.mitarbeiter.emp_edit_sensitive = false;
  if (data.permissions.manager.emp_docs_manage === undefined) data.permissions.manager.emp_docs_manage = false;
  if (data.permissions.mitarbeiter.emp_docs_manage === undefined) data.permissions.mitarbeiter.emp_docs_manage = false;
  if (data.permissions.manager.custom_fields_manage === undefined) data.permissions.manager.custom_fields_manage = false;
  if (data.permissions.mitarbeiter.custom_fields_manage === undefined) data.permissions.mitarbeiter.custom_fields_manage = false;
  if (!data.chats) data.chats = [];
  if (!data.messages) data.messages = [];
  if (!data.tickets) data.tickets = [];
  if (!data.materialRequests) data.materialRequests = [];
  if (!data.materials) data.materials = [];
  if (!data.notifications) data.notifications = [];
  const MATERIAL_STATUS_MIGRATION: Record<string, MaterialRequestStatus> = {
    entwurf: 'eingereicht',
    eingereicht: 'eingereicht',
    in_pruefung: 'in_bearbeitung',
    genehmigt: 'in_bearbeitung',
    bestellt: 'in_bearbeitung',
    in_bearbeitung: 'in_bearbeitung',
    geliefert: 'erledigt',
    erledigt: 'erledigt',
    abgelehnt: 'abgelehnt',
  };
  data.materialRequests.forEach((m) => {
    const anyM = m as any;
    if (anyM.createdByEmployeeId === undefined) anyM.createdByEmployeeId = m.employeeId ?? 'system';
    if (anyM.assigneeId === undefined) anyM.assigneeId = null;
    // Sehr alte Materialanfragen (vor "items[]"): genau ein Artikel als flache Felder auf der Anfrage selbst.
    if (!Array.isArray(anyM.items)) {
      anyM.items = anyM.materialName ? [{ id: uid(), materialName: anyM.materialName, quantity: anyM.quantity ?? 1 }] : [];
      delete anyM.materialName;
      delete anyM.quantity;
      delete anyM.unit;
    }
    // Ältere "items[]"-Generation (materialName/unit statt materialId/customMaterialName) auf das neue,
    // schlankere Positionsformat ohne Einheit normalisieren.
    anyM.items = anyM.items.map((it: any) =>
      it.materialName !== undefined || it.unit !== undefined
        ? { id: it.id ?? uid(), customMaterialName: it.materialName ?? 'Artikel', quantity: it.quantity ?? 1 }
        : { id: it.id ?? uid(), materialId: it.materialId ?? null, customMaterialName: it.customMaterialName ?? null, quantity: it.quantity ?? 1 }
    );
    if (!Array.isArray(anyM.photos)) {
      anyM.photos = anyM.photo ? [anyM.photo] : [];
      delete anyM.photo;
    }
    if (anyM.completedAt === undefined) anyM.completedAt = null;
    if (anyM.completedBy === undefined) anyM.completedBy = null;
    m.status = MATERIAL_STATUS_MIGRATION[m.status as string] ?? 'eingereicht';
  });
  if (data.permissions.manager.tickets_view_own === undefined) {
    data.permissions.manager.tickets_view_own = false;
    data.permissions.manager.tickets_view_all = true;
    data.permissions.manager.tickets_create = true;
    data.permissions.manager.tickets_edit = true;
    data.permissions.manager.tickets_assign = true;
    data.permissions.manager.tickets_status_update = true;
    data.permissions.manager.tickets_calendar_view = true;
    data.permissions.manager.material_request = false;
    data.permissions.manager.material_manage = true;
  }
  if (data.permissions.mitarbeiter.tickets_view_own === undefined) {
    data.permissions.mitarbeiter.tickets_view_own = true;
    data.permissions.mitarbeiter.tickets_view_all = false;
    data.permissions.mitarbeiter.tickets_create = false;
    data.permissions.mitarbeiter.tickets_edit = false;
    data.permissions.mitarbeiter.tickets_assign = false;
    data.permissions.mitarbeiter.tickets_status_update = true;
    data.permissions.mitarbeiter.tickets_calendar_view = false;
    data.permissions.mitarbeiter.material_request = true;
    data.permissions.mitarbeiter.material_manage = false;
  }
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
    authView: 'login',
    passwordResetToken: null,
    weekOffset: 0,
    filter: {},
    sidebarOpen: false,
    userMenuOpen: false,
    mobileDay: isoDate(new Date()),
    modal: null,
    panelShiftId: null,
    panelLocationId: null,
    panelTimeEntryId: null,
    panelLiveStatusId: null,
    panelMyShiftId: null,
    panelTicketId: null,
    panelMaterialRequestId: null,
  };
}

function logChange(entry: TimeEntry, text: string, by: string): TimeEntry {
  return {
    ...entry,
    changeLog: [...entry.changeLog, { ts: new Date().toISOString(), text, by }],
  };
}

function pushNotif(list: AppNotification[], n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): AppNotification[] {
  return [...list, { ...n, id: uid(), read: false, createdAt: new Date().toISOString() }];
}

const MATERIAL_STATUS_NOTIF: Partial<Record<MaterialRequestStatus, { type: NotificationType; title: string; message?: string }>> = {
  in_bearbeitung: { type: 'material_ordered', title: 'Materialbestellung in Bearbeitung' },
  erledigt: { type: 'material_delivered', title: 'Materialbestellung erledigt', message: 'Deine Materialbestellung wurde erledigt.' },
  abgelehnt: { type: 'material_rejected', title: 'Materialbestellung abgelehnt' },
};

/** Kurze Zusammenfassung der Positionen für Benachrichtigungstexte, z. B. "4× WC-Papier, 2× Müllsäcke". */
function summarizeItems(items: MaterialRequestItem[], materials: Material[]): string {
  const text = items
    .map((i) => `${i.quantity}× ${i.customMaterialName || materials.find((m) => m.id === i.materialId)?.name || 'Artikel'}`)
    .join(', ');
  return text.length > 70 ? `${text.slice(0, 67)}…` : text;
}

function materialStatusNotifications(
  notifications: AppNotification[],
  req: MaterialRequest,
  newStatus: MaterialRequestStatus,
  materials: Material[]
): AppNotification[] {
  if (!req.employeeId || newStatus === req.status) return notifications;
  const cfg = MATERIAL_STATUS_NOTIF[newStatus];
  if (!cfg) return notifications;
  return pushNotif(notifications, {
    type: cfg.type,
    title: cfg.title,
    message: cfg.message ?? summarizeItems(req.items, materials),
    targetRole: 'mitarbeiter',
    targetUserId: req.employeeId,
    linkedMaterialRequestId: req.id,
    linkedTicketId: null,
  });
}

interface AppContextValue {
  state: AppState;
  toasts: ToastItem[];
  toast: (message: string) => void;
  actions: {
    // auth / nav
    attemptLogin: (email: string, password: string) => void;
    logout: () => void;
    setAuthView: (view: 'login' | 'forgot' | 'reset') => void;
    // Passwort zurücksetzen (Prototyp-Simulation, siehe PasswordResetToken-Kommentar oben)
    requestPasswordReset: (email: string) => void;
    resetPassword: (newPassword: string) => void;
    // Mitarbeiter ändert das eigene Passwort im Profil (nur das eigene, siehe MeProfilePage)
    changeMyPassword: (currentPassword: string, newPassword: string) => boolean;
    // Admin/Manager: bestehendes Passwort ungültig machen, Mitarbeiter muss sich per "Passwort vergessen" neu setzen
    invalidateEmployeePassword: (employeeId: string) => void;
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
    openLiveStatusPanel: (id: string) => void;
    closeLiveStatusPanel: () => void;
    openMyShiftPanel: (id: string) => void;
    closeMyShiftPanel: () => void;
    openTicketPanel: (id: string) => void;
    closeTicketPanel: () => void;
    openMaterialRequestPanel: (id: string) => void;
    closeMaterialRequestPanel: () => void;
    // employees
    saveEmployee: (
      data: Omit<Employee, 'id' | 'customerIds' | 'password'> & { customerIds: string[]; password?: string },
      id?: string | null
    ) => void;
    deleteEmployee: (id: string) => void;
    toggleEmployeeStatus: (id: string) => void;
    // Zusatzfelder (Schema, admin-/managerweit)
    saveCustomFieldDef: (data: Omit<CustomFieldDef, 'id'>, id?: string | null) => void;
    deleteCustomFieldDef: (id: string) => void;
    // Mitarbeiterdokumente (Metadaten; die Datei selbst liegt in IndexedDB, siehe utils/docStore.ts)
    addEmployeeDocument: (employeeId: string, doc: EmployeeDocumentMeta) => void;
    updateEmployeeDocument: (employeeId: string, docId: string, updates: Partial<Pick<EmployeeDocumentMeta, 'docType' | 'note'>>) => void;
    deleteEmployeeDocument: (employeeId: string, docId: string) => void;
    // shifts
    saveShift: (data: Omit<Shift, 'id'>, id?: string | null) => void;
    deleteShift: (id: string) => void;
    duplicateShift: (id: string) => void;
    claimOpenShift: (id: string) => void;
    moveShift: (id: string, newDate: string) => void;
    moveShiftTo: (id: string, newDate: string, newEmployeeId: string | null) => void;
    // absences
    saveAbsence: (data: Omit<Absence, 'id'>) => void;
    setAbsStatus: (id: string, status: AbsenceStatus) => void;
    deleteAbsence: (id: string) => void;
    moveAbsence: (id: string, newStart: string) => void;
    moveAbsenceTo: (id: string, newStart: string, newEmployeeId: string) => void;
    resizeAbsence: (id: string, edge: 'start' | 'end', newDate: string) => void;
    cancelMyAbsence: (id: string) => void;
    saveMeAbsence: (data: Omit<Absence, 'id' | 'employeeId' | 'status'>) => void;
    // time entries
    confirmClockIn: (
      employeeId: string,
      customerId: string,
      geo: GeoFix,
      distance: number,
      radius: number,
      geofenceOk: boolean,
      serviceId?: string | null
    ) => void;
    confirmClockOut: (employeeId: string, geo: GeoFix, distance: number, successMessage?: string) => void;
    startPause: (employeeId: string) => void;
    endPause: (employeeId: string) => void;
    quickSetStatus: (entryId: string, status: TimeEntry['status']) => void;
    saveTimeEntryDetail: (
      entryId: string,
      updates: { start: string; end: string; pauseMinutes: number; notes: string; status: TimeEntry['status']; serviceId?: string | null }
    ) => void;
    submitMeCorrection: (entryId: string, note: string) => void;
    resolveCorrection: (id: string, status: TimeCorrection['status']) => void;
    // services (Leistungen)
    saveService: (data: Omit<Service, 'id' | 'active'>, id?: string | null) => void;
    toggleServiceActive: (id: string) => void;
    // Artikel (Materialbestellung)
    saveMaterial: (data: Omit<Material, 'id' | 'active'>, id?: string | null) => void;
    toggleMaterialActive: (id: string) => void;
    deleteMaterial: (id: string) => void;
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
    saveMyPhoto: (photoUrl: string | null) => void;
    // Nachrichten (Prototyp: localStorage für Text, IndexedDB für Anhänge — siehe utils/chatAttachmentStore.ts)
    sendMessage: (input: {
      senderId: string;
      recipientId: string;
      text: string;
      attachments?: MessageAttachmentMeta[];
      replyToId?: string | null;
    }) => void;
    markChatRead: (chatId: string, readerId: string) => void;
    // Tickets (Aufgaben/Kundentickets)
    createTicket: (
      data: Omit<
        Ticket,
        'id' | 'ticketNumber' | 'comments' | 'attachments' | 'activityLog' | 'createdAt' | 'updatedAt' | 'createdBy' | 'materialRequestId'
      >
    ) => void;
    updateTicket: (id: string, patch: Partial<Ticket>) => void;
    deleteTicket: (id: string) => void;
    setTicketStatus: (id: string, status: TicketStatus) => void;
    assignTicket: (id: string, assignedEmployeeId: string | null, assignedManagerId: string | null) => void;
    moveTicketDate: (id: string, newDueDate: string, newDueTime?: string | null) => void;
    addTicketComment: (id: string, text: string) => void;
    addTicketAttachment: (id: string, meta: TicketAttachmentMeta) => void;
    // Materialanfragen
    createMaterialRequest: (
      data: Omit<
        MaterialRequest,
        'id' | 'status' | 'linkedTicketId' | 'createdAt' | 'updatedAt' | 'createdByEmployeeId' | 'assigneeId' | 'completedAt' | 'completedBy'
      >
    ) => void;
    createMaterialRequestAdmin: (
      data: Omit<MaterialRequest, 'id' | 'linkedTicketId' | 'createdAt' | 'updatedAt' | 'createdByEmployeeId' | 'completedAt' | 'completedBy'>
    ) => void;
    updateMaterialRequest: (id: string, patch: Partial<MaterialRequest>) => void;
    setMaterialRequestStatus: (id: string, status: MaterialRequestStatus) => void;
    completeMaterialRequest: (id: string) => void;
    withdrawMaterialRequest: (id: string) => void;
    deleteMaterialRequest: (id: string) => void;
    convertMaterialRequestToTicket: (
      id: string,
      extra: { assignedEmployeeId?: string | null; assignedManagerId?: string | null; dueDate?: string | null; priority?: TicketPriority }
    ) => void;
    // Benachrichtigungen
    markNotificationRead: (id: string) => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadInitialState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const persistable: AppData = {
        employees: state.employees,
        customers: state.customers,
        services: state.services,
        shifts: state.shifts,
        absences: state.absences,
        timeEntries: state.timeEntries,
        timeCorrections: state.timeCorrections,
        customFieldDefs: state.customFieldDefs,
        chats: state.chats,
        messages: state.messages,
        tickets: state.tickets,
        materialRequests: state.materialRequests,
        materials: state.materials,
        notifications: state.notifications,
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

  // Hält mehrere gleichzeitig offene Tabs/Fenster (z. B. Admin- und Mitarbeiter-Ansicht nebeneinander
  // zum Testen) synchron: Sobald ein anderer Tab im selben Browser Daten speichert (z. B. Standort-Radius
  // geändert), übernimmt dieser Tab die aktuellen Daten sofort, ohne die eigene Navigation/Login-Session
  // zu verlieren.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const incoming = migrateData(JSON.parse(e.newValue) as AppData);
        setState((s) => ({
          ...s,
          employees: incoming.employees,
          customers: incoming.customers,
          services: incoming.services,
          shifts: incoming.shifts,
          absences: incoming.absences,
          timeEntries: incoming.timeEntries,
          timeCorrections: incoming.timeCorrections,
          customFieldDefs: incoming.customFieldDefs,
          chats: incoming.chats,
          messages: incoming.messages,
          tickets: incoming.tickets,
          materialRequests: incoming.materialRequests,
          materials: incoming.materials,
          notifications: incoming.notifications,
          settings: incoming.settings,
          permissions: incoming.permissions,
        }));
      } catch {
        /* ignore malformed data written by another tab */
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Überfällige Tickets erkennen: einmal beim Laden und danach in einem groben Intervall, damit ein
  // Ticket auch dann als überfällig gemeldet wird, wenn einfach nur das Datum verstreicht (ohne dass
  // jemand aktiv etwas an dem Ticket ändert). Pro Ticket entsteht dabei höchstens eine Benachrichtigung.
  useEffect(() => {
    const checkOverdue = () => {
      const todayIso = isoDate(new Date());
      setState((s) => {
        const overdue = s.tickets.filter(
          (t) =>
            t.dueDate &&
            t.dueDate < todayIso &&
            t.status !== 'erledigt' &&
            t.status !== 'abgeschlossen' &&
            !s.notifications.some((n) => n.type === 'ticket_overdue' && n.linkedTicketId === t.id)
        );
        if (!overdue.length) return s;
        let notifications = s.notifications;
        overdue.forEach((t) => {
          notifications = pushNotif(notifications, {
            type: 'ticket_overdue',
            title: 'Ticket überfällig',
            message: `${t.ticketNumber} · ${t.title}`,
            targetRole: 'admin_manager',
            targetUserId: null,
            linkedMaterialRequestId: null,
            linkedTicketId: t.id,
          });
        });
        return { ...s, notifications };
      });
    };
    checkOverdue();
    const interval = setInterval(checkOverdue, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
      // PROTOTYP-HINWEIS: Login vergleicht das eingegebene Passwort direkt mit dem im State/localStorage
      // abgelegten Klartext-Passwort. Das ist nur für die Demo tragbar. Bei einer echten Backend-Anbindung
      // ersetzt supabase.auth.signInWithPassword({email, password}) diese gesamte Funktion — die Rolle
      // käme dann weiterhin aus der employees-Tabelle, verknüpft über die Supabase-User-ID.
      attemptLogin: (email, password) => {
        setState((s) => {
          const query = email.trim().toLowerCase();
          const emp = query ? s.employees.find((e) => e.status === 'aktiv' && e.email.trim().toLowerCase() === query) : undefined;
          if (!emp || !password || password !== emp.password) {
            return { ...s, loginError: 'E-Mail oder Passwort ist nicht korrekt.' };
          }
          return {
            ...s,
            currentUserId: emp.id,
            loggedIn: true,
            view: emp.systemRole === 'mitarbeiter' ? 'me-time' : 'dashboard',
            sidebarOpen: false,
            userMenuOpen: false,
            loginError: '',
            authView: 'login',
            passwordResetToken: null,
            modal: null,
            panelShiftId: null,
            panelLocationId: null,
            panelTimeEntryId: null,
            panelLiveStatusId: null,
            panelMyShiftId: null,
            panelTicketId: null,
            panelMaterialRequestId: null,
          };
        });
      },
      logout: () => {
        setState((s) => ({
          ...s,
          loggedIn: false,
          userMenuOpen: false,
          authView: 'login',
          passwordResetToken: null,
          modal: null,
          panelShiftId: null,
          panelLocationId: null,
          panelTimeEntryId: null,
          panelLiveStatusId: null,
          panelMyShiftId: null,
          panelTicketId: null,
          panelMaterialRequestId: null,
        }));
      },
      setAuthView: (view) => setState((s) => ({ ...s, authView: view, loginError: '' })),
      // Prototyp-Simulation von supabase.auth.resetPasswordForEmail(): zeigt bewusst IMMER dieselbe
      // neutrale Erfolgsmeldung (siehe LoginPage), unabhängig davon, ob die E-Mail zu einem Konto passt —
      // nur so lässt sich am Client nicht ablesen, ob ein Konto existiert. Das Token lebt nur im UI-State
      // dieser Sitzung (nicht in AppData/localStorage) und dient hier nur der Demo-Kurzstrecke
      // "Passwort jetzt zurücksetzen", weil in diesem Prototyp keine E-Mail wirklich verschickt wird.
      // TODO (Supabase Auth): diese ganze Funktion durch
      //   await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://app.planico.ch/reset-password' })
      // ersetzen — Supabase verschickt dann selbst eine echte E-Mail mit einem signierten Link, und
      // passwordResetToken/resetPassword unten entfallen zugunsten von supabase.auth.updateUser({password}),
      // aufgerufen auf der Seite, die der echte Link öffnet.
      requestPasswordReset: (email) => {
        setState((s) => {
          const query = email.trim().toLowerCase();
          const emp = s.employees.find((e) => (e.status === 'aktiv' || e.status === 'eingeladen') && e.email.trim().toLowerCase() === query);
          return { ...s, passwordResetToken: { token: uid(), employeeId: emp?.id ?? null, email: query } };
        });
      },
      resetPassword: (newPassword) => {
        setState((s) => {
          const tok = s.passwordResetToken;
          if (!tok || !tok.employeeId) {
            return { ...s, passwordResetToken: null, authView: 'login' };
          }
          return {
            ...s,
            employees: s.employees.map((e) => (e.id === tok.employeeId ? { ...e, password: newPassword, status: 'aktiv' } : e)),
            passwordResetToken: null,
            authView: 'login',
          };
        });
        // Bewusst dieselbe Erfolgsmeldung, egal ob wirklich ein Konto betroffen war (siehe oben).
        setTimeout(() => toast('Dein Passwort wurde geändert.'), 0);
      },
      changeMyPassword: (currentPassword, newPassword) => {
        let ok = false;
        setState((s) => {
          const me = s.employees.find((e) => e.id === s.currentUserId);
          if (!me || me.password !== currentPassword) return s;
          ok = true;
          return { ...s, employees: s.employees.map((e) => (e.id === me.id ? { ...e, password: newPassword } : e)) };
        });
        toast(ok ? 'Passwort geändert.' : 'Aktuelles Passwort ist nicht korrekt.');
        return ok;
      },
      invalidateEmployeePassword: (employeeId) => {
        setState((s) => ({
          ...s,
          employees: s.employees.map((e) => (e.id === employeeId ? { ...e, password: uid() } : e)),
        }));
        toast('Passwort wurde ungültig gemacht — Mitarbeiter kann sich über „Passwort vergessen" neu anmelden.');
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
      openLiveStatusPanel: (id) => setState((s) => ({ ...s, panelLiveStatusId: id })),
      closeLiveStatusPanel: () => setState((s) => ({ ...s, panelLiveStatusId: null })),
      openMyShiftPanel: (id) => setState((s) => ({ ...s, panelMyShiftId: id })),
      closeMyShiftPanel: () => setState((s) => ({ ...s, panelMyShiftId: null })),
      openTicketPanel: (id) =>
        setState((s) => ({
          ...s,
          panelTicketId: id,
          notifications: s.notifications.map((n) => (n.linkedTicketId === id && !n.read ? { ...n, read: true } : n)),
        })),
      closeTicketPanel: () => setState((s) => ({ ...s, panelTicketId: null })),
      openMaterialRequestPanel: (id) =>
        setState((s) => ({
          ...s,
          panelMaterialRequestId: id,
          notifications: s.notifications.map((n) => (n.linkedMaterialRequestId === id && !n.read ? { ...n, read: true } : n)),
        })),
      closeMaterialRequestPanel: () => setState((s) => ({ ...s, panelMaterialRequestId: null })),

      saveEmployee: (data, id) => {
        setState((s) => {
          if (id) {
            return {
              ...s,
              employees: s.employees.map((e) => (e.id === id ? { ...e, ...data } : e)),
            };
          }
          const emp: Employee = { id: uid(), password: 'demo1234', ...data };
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

      saveCustomFieldDef: (data, id) => {
        setState((s) => {
          if (id) {
            return { ...s, customFieldDefs: s.customFieldDefs.map((f) => (f.id === id ? { ...f, ...data } : f)) };
          }
          return { ...s, customFieldDefs: [...s.customFieldDefs, { id: uid(), ...data }] };
        });
        toast(id ? 'Zusatzfeld aktualisiert.' : 'Zusatzfeld angelegt.');
      },
      deleteCustomFieldDef: (id) => {
        if (!window.confirm('Dieses Zusatzfeld wirklich löschen? Bereits erfasste Werte gehen dabei verloren.')) return;
        setState((s) => ({
          ...s,
          customFieldDefs: s.customFieldDefs.filter((f) => f.id !== id),
          employees: s.employees.map((e) => {
            if (!e.customFieldValues || !(id in e.customFieldValues)) return e;
            const rest = { ...e.customFieldValues };
            delete rest[id];
            return { ...e, customFieldValues: rest };
          }),
        }));
        toast('Zusatzfeld gelöscht.');
      },

      addEmployeeDocument: (employeeId, doc) => {
        setState((s) => ({
          ...s,
          employees: s.employees.map((e) => (e.id === employeeId ? { ...e, documents: [...(e.documents ?? []), doc] } : e)),
        }));
        toast('Dokument hochgeladen.');
      },
      updateEmployeeDocument: (employeeId, docId, updates) => {
        setState((s) => ({
          ...s,
          employees: s.employees.map((e) =>
            e.id === employeeId
              ? { ...e, documents: (e.documents ?? []).map((d) => (d.id === docId ? { ...d, ...updates } : d)) }
              : e
          ),
        }));
        toast('Dokument aktualisiert.');
      },
      deleteEmployeeDocument: (employeeId, docId) => {
        setState((s) => ({
          ...s,
          employees: s.employees.map((e) =>
            e.id === employeeId ? { ...e, documents: (e.documents ?? []).filter((d) => d.id !== docId) } : e
          ),
        }));
        toast('Dokument gelöscht.');
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
      moveShift: (id, newDate) => {
        setState((s) => ({ ...s, shifts: s.shifts.map((sh) => (sh.id === id && sh.date !== newDate ? { ...sh, date: newDate } : sh)) }));
        toast('Schicht verschoben.');
      },
      moveShiftTo: (id, newDate, newEmployeeId) => {
        setState((s) => ({
          ...s,
          shifts: s.shifts.map((sh) => {
            if (sh.id !== id || (sh.date === newDate && sh.employeeId === newEmployeeId)) return sh;
            const status: ShiftStatus = !newEmployeeId ? 'offen' : sh.status === 'offen' ? 'geplant' : sh.status;
            return { ...sh, date: newDate, employeeId: newEmployeeId, status };
          }),
        }));
        toast(newEmployeeId ? 'Schicht verschoben.' : 'Schicht als offen markiert.');
      },

      saveAbsence: (data) => {
        setState((s) => ({ ...s, absences: [...s.absences, { id: uid(), ...data }] }));
        toast('Antrag erfasst.');
      },
      setAbsStatus: (id, status) => {
        setState((s) => ({ ...s, absences: s.absences.map((a) => (a.id === id ? { ...a, status } : a)) }));
        toast(status === 'genehmigt' ? 'Antrag genehmigt.' : 'Antrag abgelehnt.');
      },
      deleteAbsence: (id) => {
        setState((s) => ({ ...s, absences: s.absences.filter((a) => a.id !== id) }));
      },
      moveAbsence: (id, newStart) => {
        setState((s) => ({
          ...s,
          absences: s.absences.map((a) => {
            if (a.id !== id || a.start === newStart) return a;
            const lengthDays = Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 86400000);
            const newEnd = isoDate(addDays(new Date(newStart), lengthDays));
            return { ...a, start: newStart, end: newEnd };
          }),
        }));
        toast('Abwesenheit verschoben.');
      },
      moveAbsenceTo: (id, newStart, newEmployeeId) => {
        setState((s) => ({
          ...s,
          absences: s.absences.map((a) => {
            if (a.id !== id) return a;
            const lengthDays = Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 86400000);
            const newEnd = isoDate(addDays(new Date(newStart), lengthDays));
            return { ...a, start: newStart, end: newEnd, employeeId: newEmployeeId };
          }),
        }));
        toast('Abwesenheit verschoben.');
      },
      resizeAbsence: (id, edge, newDate) => {
        setState((s) => ({
          ...s,
          absences: s.absences.map((a) => {
            if (a.id !== id) return a;
            return edge === 'start' ? { ...a, start: newDate } : { ...a, end: newDate };
          }),
        }));
        toast('Zeitraum angepasst.');
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

      confirmClockIn: (employeeId, customerId, geo, distance, radius, geofenceOk, serviceId) => {
        const now = new Date().toISOString();
        setState((s) => ({
          ...s,
          timeEntries: [
            ...s.timeEntries,
            {
              id: uid(),
              employeeId,
              customerId,
              serviceId: serviceId ?? null,
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
      confirmClockOut: (employeeId, geo, distance, successMessage) => {
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
        toast(successMessage ?? 'Erfolgreich ausgestempelt.');
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
              if (updates.serviceId !== undefined && updates.serviceId !== t.serviceId) {
                const oldName = s.services.find((sv) => sv.id === t.serviceId)?.name ?? 'Keine Leistung';
                const newName = s.services.find((sv) => sv.id === updates.serviceId)?.name ?? 'Keine Leistung';
                next = logChange(next, `Leistung wurde von "${oldName}" auf "${newName}" geändert.`, by);
                next = { ...next, serviceId: updates.serviceId };
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

      saveService: (data, id) => {
        setState((s) => {
          if (id) {
            return { ...s, services: s.services.map((sv) => (sv.id === id ? { ...sv, ...data } : sv)) };
          }
          return { ...s, services: [...s.services, { id: uid(), active: true, ...data }] };
        });
        toast(id ? 'Leistung aktualisiert.' : 'Leistung angelegt.');
      },
      toggleServiceActive: (id) => {
        let nowActive = true;
        setState((s) => ({
          ...s,
          services: s.services.map((sv) => {
            if (sv.id !== id) return sv;
            nowActive = !sv.active;
            return { ...sv, active: nowActive };
          }),
        }));
        setTimeout(() => toast(nowActive ? 'Leistung aktiviert.' : 'Leistung deaktiviert.'), 0);
      },

      saveMaterial: (data, id) => {
        setState((s) => {
          if (id) {
            return { ...s, materials: s.materials.map((mat) => (mat.id === id ? { ...mat, ...data } : mat)) };
          }
          return { ...s, materials: [...s.materials, { id: uid(), active: true, ...data }] };
        });
        toast(id ? 'Artikel aktualisiert.' : 'Artikel angelegt.');
      },
      toggleMaterialActive: (id) => {
        let nowActive = true;
        setState((s) => ({
          ...s,
          materials: s.materials.map((mat) => {
            if (mat.id !== id) return mat;
            nowActive = !mat.active;
            return { ...mat, active: nowActive };
          }),
        }));
        setTimeout(() => toast(nowActive ? 'Artikel aktiviert.' : 'Artikel deaktiviert.'), 0);
      },
      deleteMaterial: (id) => {
        setState((s) => {
          const inUse = s.materialRequests.some((m) => m.items.some((it) => it.materialId === id));
          if (inUse) {
            setTimeout(() => toast('Artikel wird noch in Bestellungen verwendet – zuerst deaktivieren.'), 0);
            return s;
          }
          setTimeout(() => toast('Artikel gelöscht.'), 0);
          return { ...s, materials: s.materials.filter((mat) => mat.id !== id) };
        });
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
      saveMyPhoto: (photoUrl) => {
        // Ändert ausschliesslich das Profilbild des aktuell eingeloggten Kontos – niemals das einer anderen Person.
        setState((s) => ({
          ...s,
          employees: s.employees.map((e) => (e.id === s.currentUserId ? { ...e, photoUrl: photoUrl ?? undefined } : e)),
        }));
        toast(photoUrl ? 'Profilbild gespeichert.' : 'Profilbild entfernt.');
      },

      sendMessage: ({ senderId, recipientId, text, attachments, replyToId }) => {
        const chatId = makeChatId(senderId, recipientId);
        const now = new Date().toISOString();
        setState((s) => {
          const chatExists = s.chats.some((c) => c.id === chatId);
          const chats = chatExists
            ? s.chats
            : [...s.chats, { id: chatId, participantIds: [senderId, recipientId].sort() as [string, string], createdAt: now }];
          const msg: ChatMessage = {
            id: uid(),
            chatId,
            senderId,
            recipientId,
            text,
            createdAt: now,
            read: false,
            attachments,
            replyToId: replyToId ?? null,
          };
          return { ...s, chats, messages: [...s.messages, msg] };
        });
      },
      markChatRead: (chatId, readerId) => {
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) => (m.chatId === chatId && m.recipientId === readerId && !m.read ? { ...m, read: true } : m)),
        }));
      },

      createTicket: (data) => {
        const now = new Date().toISOString();
        setState((s) => {
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          const ticket: Ticket = {
            ...data,
            id: uid(),
            ticketNumber: `T-${String(s.tickets.length + 1).padStart(4, '0')}`,
            materialRequestId: null,
            comments: [],
            attachments: [],
            activityLog: [{ id: uid(), ts: now, text: 'Ticket erstellt', by }],
            createdBy: by,
            createdAt: now,
            updatedAt: now,
          };
          let notifications = s.notifications;
          if (ticket.priority === 'dringend') {
            const cust = s.customers.find((c) => c.id === ticket.customerId);
            notifications = pushNotif(notifications, {
              type: 'ticket_urgent',
              title: 'Dringendes Ticket erstellt',
              message: `${ticket.ticketNumber} · ${ticket.title}${cust ? ' · ' + cust.name : ''}`,
              targetRole: 'admin_manager',
              targetUserId: null,
              linkedMaterialRequestId: null,
              linkedTicketId: ticket.id,
            });
          }
          return { ...s, tickets: [...s.tickets, ticket], notifications };
        });
        toast('Ticket erstellt.');
      },
      updateTicket: (id, patch) => {
        setState((s) => {
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          const now = new Date().toISOString();
          return {
            ...s,
            tickets: s.tickets.map((t) =>
              t.id === id
                ? { ...t, ...patch, activityLog: [...t.activityLog, { id: uid(), ts: now, text: 'Ticket bearbeitet', by }], updatedAt: now }
                : t
            ),
          };
        });
        toast('Ticket aktualisiert.');
      },
      deleteTicket: (id) => {
        setState((s) => ({
          ...s,
          tickets: s.tickets.filter((t) => t.id !== id),
          panelTicketId: s.panelTicketId === id ? null : s.panelTicketId,
        }));
        toast('Ticket gelöscht.');
      },
      setTicketStatus: (id, status) => {
        setState((s) => {
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          const now = new Date().toISOString();
          return {
            ...s,
            tickets: s.tickets.map((t) => {
              if (t.id !== id) return t;
              const text = status === 'abgeschlossen' ? 'Ticket abgeschlossen' : `Status geändert zu "${TICKET_STATUS_TEXT[status]}"`;
              return { ...t, status, activityLog: [...t.activityLog, { id: uid(), ts: now, text, by }], updatedAt: now };
            }),
          };
        });
        toast('Status aktualisiert.');
      },
      assignTicket: (id, assignedEmployeeId, assignedManagerId) => {
        setState((s) => {
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          const now = new Date().toISOString();
          const existing = s.tickets.find((t) => t.id === id);
          let notifications = s.notifications;
          if (existing && assignedEmployeeId && assignedEmployeeId !== existing.assignedEmployeeId) {
            const cust = s.customers.find((c) => c.id === existing.customerId);
            notifications = pushNotif(notifications, {
              type: 'ticket_assigned',
              title: 'Neues Ticket zugewiesen',
              message: `${existing.ticketNumber} · ${existing.title}${cust ? ' · ' + cust.name : ''}`,
              targetRole: 'mitarbeiter',
              targetUserId: assignedEmployeeId,
              linkedMaterialRequestId: null,
              linkedTicketId: id,
            });
          }
          return {
            ...s,
            tickets: s.tickets.map((t) =>
              t.id === id
                ? {
                    ...t,
                    assignedEmployeeId,
                    assignedManagerId,
                    activityLog: [...t.activityLog, { id: uid(), ts: now, text: 'Mitarbeiter zugewiesen', by }],
                    updatedAt: now,
                  }
                : t
            ),
            notifications,
          };
        });
        toast('Zuweisung gespeichert.');
      },
      moveTicketDate: (id, newDueDate, newDueTime) => {
        setState((s) => {
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          const now = new Date().toISOString();
          return {
            ...s,
            tickets: s.tickets.map((t) =>
              t.id === id
                ? {
                    ...t,
                    dueDate: newDueDate,
                    dueTime: newDueTime !== undefined ? newDueTime : t.dueTime,
                    activityLog: [...t.activityLog, { id: uid(), ts: now, text: 'Datum geändert', by }],
                    updatedAt: now,
                  }
                : t
            ),
          };
        });
        toast('Termin verschoben.');
      },
      addTicketComment: (id, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setState((s) => {
          const me = currentUser(s, s.currentUserId);
          const by = me?.name || 'System';
          const now = new Date().toISOString();
          return {
            ...s,
            tickets: s.tickets.map((t) =>
              t.id === id
                ? {
                    ...t,
                    comments: [...t.comments, { id: uid(), authorId: me?.id ?? '', authorName: by, text: trimmed, createdAt: now }],
                    activityLog: [...t.activityLog, { id: uid(), ts: now, text: 'Kommentar hinzugefügt', by }],
                    updatedAt: now,
                  }
                : t
            ),
          };
        });
      },
      addTicketAttachment: (id, meta) => {
        setState((s) => {
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          const now = new Date().toISOString();
          return {
            ...s,
            tickets: s.tickets.map((t) =>
              t.id === id
                ? {
                    ...t,
                    attachments: [...t.attachments, meta],
                    activityLog: [...t.activityLog, { id: uid(), ts: now, text: `Anhang hinzugefügt: ${meta.fileName}`, by }],
                    updatedAt: now,
                  }
                : t
            ),
          };
        });
      },

      createMaterialRequest: (data) => {
        const now = new Date().toISOString();
        setState((s) => {
          const id = uid();
          const requester = currentUser(s, data.employeeId ?? s.currentUserId);
          const requesterName = requester?.name ?? 'Unbekannt';
          const cust = s.customers.find((c) => c.id === data.locationId);
          const notifications = pushNotif(s.notifications, {
            type: 'material_new',
            title: `Neue Materialanfrage von ${requesterName}`,
            message: `${requesterName} · ${cust ? cust.name : 'Kein Objekt'} · ${summarizeItems(data.items, s.materials)}`,
            targetRole: 'admin_manager',
            targetUserId: null,
            linkedMaterialRequestId: id,
            linkedTicketId: null,
          });
          return {
            ...s,
            materialRequests: [
              ...s.materialRequests,
              {
                ...data,
                id,
                createdByEmployeeId: data.employeeId ?? s.currentUserId ?? 'unknown',
                assigneeId: null,
                status: 'eingereicht',
                completedAt: null,
                completedBy: null,
                linkedTicketId: null,
                createdAt: now,
                updatedAt: now,
              },
            ],
            notifications,
          };
        });
        toast('Bestellung gesendet.');
      },
      createMaterialRequestAdmin: (data) => {
        const now = new Date().toISOString();
        setState((s) => ({
          ...s,
          materialRequests: [
            ...s.materialRequests,
            {
              ...data,
              id: uid(),
              createdByEmployeeId: s.currentUserId ?? 'unknown',
              completedAt: null,
              completedBy: null,
              linkedTicketId: null,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        toast('Materialbestellung erstellt.');
      },
      updateMaterialRequest: (id, patch) => {
        setState((s) => {
          const req = s.materialRequests.find((m) => m.id === id);
          const notifications = req && patch.status ? materialStatusNotifications(s.notifications, req, patch.status, s.materials) : s.notifications;
          return {
            ...s,
            materialRequests: s.materialRequests.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m)),
            notifications,
          };
        });
        toast('Anfrage aktualisiert.');
      },
      setMaterialRequestStatus: (id, status) => {
        setState((s) => {
          const req = s.materialRequests.find((m) => m.id === id);
          const notifications = req ? materialStatusNotifications(s.notifications, req, status, s.materials) : s.notifications;
          return {
            ...s,
            materialRequests: s.materialRequests.map((m) => (m.id === id ? { ...m, status, updatedAt: new Date().toISOString() } : m)),
            notifications,
          };
        });
        toast('Status aktualisiert.');
      },
      completeMaterialRequest: (id) => {
        setState((s) => {
          const req = s.materialRequests.find((m) => m.id === id);
          if (!req) return s;
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          const now = new Date().toISOString();
          const notifications = materialStatusNotifications(s.notifications, req, 'erledigt', s.materials);
          return {
            ...s,
            materialRequests: s.materialRequests.map((m) =>
              m.id === id ? { ...m, status: 'erledigt', completedAt: now, completedBy: by, updatedAt: now } : m
            ),
            notifications,
          };
        });
        toast('Bestellung als erledigt markiert.');
      },
      withdrawMaterialRequest: (id) => {
        setState((s) => ({
          ...s,
          materialRequests: s.materialRequests.filter((m) => m.id !== id || m.status !== 'eingereicht'),
        }));
        toast('Anfrage zurückgezogen.');
      },
      deleteMaterialRequest: (id) => {
        setState((s) => ({
          ...s,
          materialRequests: s.materialRequests.filter((m) => m.id !== id),
          panelMaterialRequestId: s.panelMaterialRequestId === id ? null : s.panelMaterialRequestId,
        }));
        toast('Bestellung gelöscht.');
      },
      markNotificationRead: (id) => {
        setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
      },
      convertMaterialRequestToTicket: (id, extra) => {
        setState((s) => {
          const req = s.materialRequests.find((m) => m.id === id);
          if (!req) return s;
          const by = currentUser(s, s.currentUserId)?.name || 'System';
          const now = new Date().toISOString();
          const itemSummary = summarizeItems(req.items, s.materials);
          const firstName = req.items[0] ? req.items[0].customMaterialName || s.materials.find((m) => m.id === req.items[0].materialId)?.name : undefined;
          const ticket: Ticket = {
            id: uid(),
            ticketNumber: `T-${String(s.tickets.length + 1).padStart(4, '0')}`,
            type: 'material',
            title: `Material: ${firstName ?? 'Bestellung'}${req.items.length > 1 ? ` +${req.items.length - 1}` : ''}`,
            description: `${itemSummary}${req.comment ? ` — ${req.comment}` : ''}`,
            customerId: req.locationId,
            locationId: req.locationId,
            assignedEmployeeId: extra.assignedEmployeeId ?? req.employeeId,
            assignedManagerId: extra.assignedManagerId ?? null,
            priority: extra.priority ?? req.priority ?? 'normal',
            status: 'neu',
            startDate: isoDate(new Date()),
            dueDate: extra.dueDate ?? req.requestedDate ?? null,
            dueTime: null,
            category: null,
            note: '',
            materialRequestId: req.id,
            comments: [],
            attachments: req.photos,
            activityLog: [
              { id: uid(), ts: now, text: 'Ticket erstellt', by },
              { id: uid(), ts: now, text: 'Material bestellt', by },
            ],
            createdBy: by,
            createdAt: now,
            updatedAt: now,
          };
          return {
            ...s,
            tickets: [...s.tickets, ticket],
            materialRequests: s.materialRequests.map((m) =>
              m.id === id ? { ...m, status: 'in_bearbeitung', linkedTicketId: ticket.id, updatedAt: now } : m
            ),
          };
        });
        toast('Als Ticket übernommen.');
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

const TICKET_STATUS_TEXT: Record<TicketStatus, string> = {
  neu: 'Neu',
  geplant: 'Geplant',
  in_bearbeitung: 'In Bearbeitung',
  wartet_rueckmeldung: 'Wartet auf Rückmeldung',
  erledigt: 'Erledigt',
  abgeschlossen: 'Abgeschlossen',
};

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
