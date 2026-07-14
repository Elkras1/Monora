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
  | 'tickets'
  | 'tickets-tasks'
  | 'tickets-material'
  | 'tickets-calendar'
  | 'me-start'
  | 'me-schedule'
  | 'me-time'
  | 'me-hours'
  | 'me-absence'
  | 'me-profile'
  | 'me-material-order';

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
  absEmpFilter?: string;
  absTypeFilter?: string;
  absRoleFilter?: string;
  absCustFilter?: string;
  reportPeriod?: 'week' | 'month';
  permRole?: 'manager' | 'mitarbeiter';
  meSchedTab?: 'day' | 'week' | 'month' | 'list' | 'open';
  hoursFilter?: 'week' | 'month' | 'all';
  tickType?: string;
  tickCust?: string;
  tickEmp?: string;
  tickManager?: string;
  tickStatus?: string;
  tickPriority?: string;
  tickDateFrom?: string;
  tickDateTo?: string;
  tickCalView?: 'day' | 'week' | 'month' | 'list';
  tickOverdueOnly?: boolean;
  matStatus?: string;
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

/**
 * Tickets (Aufgaben/Kundentickets + Materialanfragen).
 *
 * Wie beim Chat (siehe oben) ist dies bewusst ein normalisiertes, flaches Modell (eigene `Ticket`- und
 * `MaterialRequest`-Entitäten mit stabilen IDs, Kommentare/Aktivitätsverlauf als eingebettete Arrays,
 * Anhänge als reine Metadaten mit `storageRef` in die lokale IndexedDB — siehe utils/ticketAttachmentStore.ts).
 * Für eine spätere Supabase-Anbindung würden `tickets`/`materialRequests` zu eigenen Tabellen (inkl.
 * Fremdschlüsseln auf employees/customers), Kommentare/Aktivitätsverlauf könnten bei Bedarf in eigene
 * Tabellen ausgelagert werden — an der UI und den AppContext-Actions müsste sich dafür nichts ändern,
 * nur die Persistenzschicht.
 */
export type TicketType = 'aufgabe' | 'material';

export type TicketCategory =
  | 'Reinigung nachbessern'
  | 'Qualitätskontrolle'
  | 'Kundenanfrage'
  | 'Reparatur / Schaden'
  | 'Sonderreinigung'
  | 'Fensterreinigung'
  | 'Rasenpflege'
  | 'Sonstiges';

export type TicketPriority = 'niedrig' | 'normal' | 'hoch' | 'dringend';

export type TicketStatus = 'neu' | 'geplant' | 'in_bearbeitung' | 'wartet_rueckmeldung' | 'erledigt' | 'abgeschlossen';

export interface TicketComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

/** Metadaten wie bei MessageAttachmentMeta — die Bytes liegen in IndexedDB, siehe utils/ticketAttachmentStore.ts. */
export interface TicketAttachmentMeta {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  storageRef: string;
}

export interface TicketActivityEntry {
  id: string;
  ts: string;
  text: string;
  by: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  type: TicketType;
  title: string;
  description: string;
  customerId: string | null;
  locationId: string | null; // in Monora = derselbe Kunde/Standort wie customerId (kein separates Location-Entity)
  assignedEmployeeId: string | null;
  assignedManagerId: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  startDate: string | null;
  dueDate: string | null;
  dueTime: string | null; // HH:MM, optional
  category: TicketCategory | null;
  note: string; // interne Notiz
  materialRequestId: string | null; // gesetzt, wenn aus einer Materialanfrage erzeugt
  comments: TicketComment[];
  attachments: TicketAttachmentMeta[];
  activityLog: TicketActivityEntry[];
  createdBy: string; // Name
  createdAt: string;
  updatedAt: string;
}

/** Einfache Status, bewusst auf vier reduziert: "Erledigt" muss immer nur ein Klick entfernt sein. */
export type MaterialRequestStatus = 'eingereicht' | 'in_bearbeitung' | 'erledigt' | 'abgelehnt';

/** Von Admin/berechtigten Managern gepflegte Artikelliste ("Artikel verwalten"). */
export interface Material {
  id: string;
  name: string;
  active: boolean;
}

export interface MaterialRequestItem {
  id: string;
  materialId?: string | null; // Verweis auf die zentrale Artikelliste (Material)
  customMaterialName?: string | null; // freier Artikelname ("Anderer Artikel") — nur für diese Bestellung, nicht Teil der Artikelliste
  quantity: number;
}

/** Eine Materialbestellung ist EIN zusammenhängender Vorgang mit mehreren Positionen (items), nicht ein
 * Ticket pro Artikel. Bewusst schlank gehalten — Priorität/Kommentar/Wunschdatum sind optional und werden
 * vom vereinfachten Mitarbeiterformular nicht mehr abgefragt (nur noch intern/für Admin-Bestellungen nutzbar). */
export interface MaterialRequest {
  id: string;
  employeeId: string | null; // für/von wem — optional bei Admin-/Manager-Bestellungen ohne konkreten Mitarbeiter
  createdByEmployeeId: string; // wer den Eintrag angelegt hat (Mitarbeiter selbst, oder Admin/Manager)
  assigneeId: string | null; // zuständige Person (Admin/Manager), die die Anfrage bearbeitet
  locationId: string | null; // Kunde/Objekt
  items: MaterialRequestItem[];
  priority?: TicketPriority;
  comment?: string;
  note?: string; // kurze, optionale Notiz aus dem einfachen Mitarbeiterformular (gehört zur gesamten Bestellung, nicht zu einer Position)
  photos: TicketAttachmentMeta[];
  requestedDate?: string | null; // gewünschtes Datum
  status: MaterialRequestStatus;
  completedAt: string | null;
  completedBy: string | null; // Name
  linkedTicketId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Einfache Benachrichtigungsstruktur für Ticket-/Materialanfragen-Ereignisse. Wie bei Chat/Tickets ein
 * flaches, normalisiertes Modell mit stabiler ID — für Supabase später eine eigene `notifications`-Tabelle
 * mit Realtime-Subscription auf `targetUserId`/`targetRole`, ohne dass sich an der UI etwas ändern müsste.
 */
export type NotificationType =
  | 'material_new'
  | 'material_approved'
  | 'material_rejected'
  | 'material_ordered'
  | 'material_delivered'
  | 'ticket_urgent'
  | 'ticket_overdue'
  | 'ticket_assigned';

export type NotificationTargetRole = 'admin_manager' | 'mitarbeiter';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  targetRole: NotificationTargetRole;
  targetUserId: string | null; // gesetzt für mitarbeiter-spezifische Benachrichtigungen ("nur eigene sehen")
  linkedMaterialRequestId: string | null;
  linkedTicketId: string | null;
  read: boolean;
  createdAt: string;
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
  tickets: Ticket[];
  materialRequests: MaterialRequest[];
  materials: Material[];
  notifications: AppNotification[];
  settings: Settings;
  permissions: PermissionsMap;
}
