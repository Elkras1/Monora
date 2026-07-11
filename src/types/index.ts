export type SystemRole = 'admin' | 'manager' | 'mitarbeiter';

export type EmployeeStatus = 'aktiv' | 'eingeladen' | 'inaktiv';

export type EmploymentType = 'stundenlohn' | 'monatslohn';

export interface EmployeeAddress {
  street: string;
  houseNumber: string;
  zip: string;
  city: string;
  country: string;
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

/** Admin-defined additional employee field (schema), shared across all employees. Values live per-employee in Employee.customFieldValues. */
export interface CustomFieldDef {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[]; // only used when type === 'select'
}

export type EmployeeDocumentType =
  | 'Arbeitsvertrag'
  | 'Ausweis'
  | 'Arbeitsbewilligung'
  | 'AHV-Dokument'
  | 'Banknachweis'
  | 'Arztzeugnis'
  | 'Schulungsnachweis'
  | 'Sonstiges';

/**
 * Metadata only — the actual file bytes live in IndexedDB (see utils/docStore.ts), keyed by `storageRef`.
 * This split keeps the JSON app state small (fit for localStorage) while the binary content sits in a
 * storage layer that can later be swapped for e.g. Supabase Storage without changing this shape.
 */
export interface EmployeeDocumentMeta {
  id: string;
  fileName: string;
  docType: EmployeeDocumentType;
  uploadedAt: string; // ISO datetime
  uploadedBy: string; // name of the uploading user
  note: string;
  size: number; // bytes
  mimeType: string;
  storageRef: string; // key into the local document blob store
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  systemRole: SystemRole;
  email: string;
  phone: string;
  status: EmployeeStatus;
  pin: string;
  password: string; // login password (separate from the operational "pin" used for Zeiterfassung)
  startDate: string; // ISO date
  customerIds: string[];
  photoUrl?: string; // resized data-URL, self-uploaded profile picture (localStorage only)
  // Allgemein
  firstName?: string;
  lastName?: string;
  serviceIds?: string[];
  // Arbeitszeit & Lohn
  employmentType?: EmploymentType;
  hourlyRate?: number;
  monthlySalary?: number;
  currency?: string;
  weeklyTargetHours?: number;
  monthlyTargetHours?: number;
  workloadPercent?: number;
  // Stammdaten
  address?: EmployeeAddress;
  ahvNumber?: string;
  birthDate?: string;
  employmentStart?: string;
  probationEnd?: string;
  contractEnd?: string;
  iban?: string;
  employeeNotes?: string;
  // Zusatzfelder & Dokumente
  customFieldValues?: Record<string, string | number | boolean>;
  documents?: EmployeeDocumentMeta[];
}

export type IssueStatus = 'offen' | 'in Bearbeitung' | 'erledigt';
export type IssueSeverity = 'niedrig' | 'mittel' | 'hoch';

export interface CustomerIssue {
  id: string;
  date: string;
  text: string;
  status: IssueStatus;
  severity: IssueSeverity;
}

export interface CustomerTask {
  id: string;
  label: string;
  done: boolean;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
  geofenceEnabled: boolean;
  contact: string;
  phone: string;
  active: boolean;
  notes: string;
  type: string;
  area: number;
  interval: string;
  keyNumber: string;
  accessCode: string;
  accessFrom: string;
  accessTo: string;
  accessNotes: string;
  contractStart: string;
  monthlyHours: number;
  hourlyRate: number;
  tasks: CustomerTask[];
  issues: CustomerIssue[];
}

export type ShiftStatus = 'geplant' | 'offen' | 'bestätigt' | 'konflikt';

export interface Service {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface Shift {
  id: string;
  employeeId: string | null;
  customerId: string;
  serviceId: string | null;
  date: string; // ISO date
  start: string; // HH:MM
  end: string; // HH:MM
  pause: number; // minutes
  status: ShiftStatus;
  notes: string;
}

export type AbsenceType = 'Urlaub' | 'Krankheit' | 'Unfall' | 'Unbezahlt' | 'Sonstiges';
export type AbsenceStatus = 'beantragt' | 'genehmigt' | 'abgelehnt';

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  start: string;
  end: string;
  status: AbsenceStatus;
  note: string;
}

export type TimeEntryStatus = 'offen' | 'bestätigt' | 'korrigiert';

export interface ChangeLogEntry {
  ts: string;
  text: string;
  by: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  customerId: string;
  serviceId: string | null;
  clockIn: string; // ISO datetime
  clockOut: string | null;
  geofenceOk: boolean; // whether the check-in occurred within the allowed radius
  geofenceRadius: number; // radius (m) configured for the location at the time of check-in
  checkInLat: number;
  checkInLng: number;
  checkInAccuracy: number; // GPS accuracy (m) reported by the device at check-in
  checkInDistance: number; // real distance (m) from the location at check-in
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutAccuracy: number | null; // GPS accuracy (m) reported by the device at check-out
  checkOutDistance: number | null; // real distance (m) from the location at check-out
  pauseMinutes: number;
  pauseStart: string | null;
  status: TimeEntryStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  changeLog: ChangeLogEntry[];
}

export type TimeCorrectionStatus = 'offen' | 'erledigt';

export interface TimeCorrection {
  id: string;
  employeeId: string;
  entryId: string;
  note: string;
  status: TimeCorrectionStatus;
  date: string;
}

export interface ProfileEditableFields {
  phone: boolean;
  email: boolean;
}

export interface Settings {
  companyName: string;
  weeklyHours: number;
  defaultRadius: number;
  rounding: number;
  notifyLate: boolean;
  notifyGeofence: boolean;
  address: string;
  profileEditableFields: ProfileEditableFields;
}

export interface PermissionOption {
  id: string;
  label: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  perms: PermissionOption[];
}

export type PermissionsForRole = Record<string, boolean>;
export type PermissionsMap = {
  manager: PermissionsForRole;
  mitarbeiter: PermissionsForRole;
};

/** Address prediction from the Google Places Autocomplete service. */
export interface PlacePrediction {
  placeId: string;
  description: string;
}

/** Resolved place details (Google Places "place details" lookup). */
export interface PlaceDetails {
  formattedAddress: string;
  lat: number;
  lng: number;
}

export type ViewId =
  | 'dashboard'
  | 'schedule'
  | 'employees'
  | 'clock'
  | 'services'
  | 'absence'
  | 'location'
  | 'reports'
  | 'settings'
  | 'permissions'
  | 'messages'
  | 'me-start'
  | 'me-schedule'
  | 'me-time'
  | 'me-hours'
  | 'me-absence'
  | 'me-profile';

export interface FilterState {
  teEmp?: string;
  teCust?: string;
  teStatus?: string;
  tePeriod?: string;
  teDateFrom?: string;
  teDateTo?: string;
  clockTab?: 'entries' | 'eval';
  evalEmp?: string;
  evalService?: string;
  evalCust?: string;
  evalDateFrom?: string;
  evalDateTo?: string;
  evalStatus?: string;
  evalGroupBy?: 'none' | 'employee' | 'service' | 'customer' | 'day' | 'week' | 'month';
  schedStandort?: string;
  schedEmp?: string;
  schedView?: 'week' | 'month' | 'employee' | 'list';
  schedRangeFrom?: string;
  schedRangeTo?: string;
  empSearch?: string;
  absStatus?: string;
  absView?: 'month' | 'year' | 'list';
  reportPeriod?: 'week' | 'month';
  permRole?: 'manager' | 'mitarbeiter';
  meSchedTab?: 'day' | 'week' | 'month' | 'list' | 'open';
  hoursFilter?: 'week' | 'month' | 'all';
}

/**
 * Chat (1:1 zwischen Admin/Manager und Mitarbeitenden).
 *
 * Diese Prototyp-Version speichert Chats/Nachrichten im zentralen App-State und damit in localStorage
 * (siehe AppContext.tsx) – das funktioniert nur lokal in diesem einen Browser, nicht geräteübergreifend
 * und nicht in Echtzeit zwischen zwei Personen. Die Struktur (getrennte `Chat`/`ChatMessage`-Entitäten,
 * stabile IDs, `read`-Flag statt abgeleitetem Status, Anhänge als reine Metadaten mit `storageRef`) ist
 * bewusst so gehalten, dass eine spätere Anbindung an eine echte Datenbank + Supabase Realtime (Nachrichten)
 * und Supabase Storage (Anhänge) ohne Änderung der Datenform möglich ist – nur die Persistenzschicht
 * (AppContext-Actions + chatAttachmentStore.ts) müsste ersetzt werden.
 */
export interface Chat {
  id: string; // deterministisch aus den zwei Teilnehmer-IDs abgeleitet, siehe state/chat.ts#makeChatId
  participantIds: [string, string];
  createdAt: string;
}

export interface MessageAttachmentMeta {
  id: string;
  fileName: string;
  mimeType: string;
  size: number; // bytes
  uploadedAt: string;
  uploadedBy: string; // Name des Absenders
  storageRef: string; // Schlüssel in der lokalen IndexedDB (siehe utils/chatAttachmentStore.ts)
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  read: boolean;
  attachments?: MessageAttachmentMeta[];
  replyToId?: string | null;
}

export interface AppData {
  employees: Employee[];
  customers: Customer[];
  services: Service[];
  shifts: Shift[];
  absences: Absence[];
  timeEntries: TimeEntry[];
  timeCorrections: TimeCorrection[];
  customFieldDefs: CustomFieldDef[];
  chats: Chat[];
  messages: ChatMessage[];
  settings: Settings;
  permissions: PermissionsMap;
}
