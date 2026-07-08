export type SystemRole = 'admin' | 'manager' | 'mitarbeiter';

export type EmployeeStatus = 'aktiv' | 'inaktiv';

export interface Employee {
  id: string;
  name: string;
  role: string;
  systemRole: SystemRole;
  email: string;
  phone: string;
  status: EmployeeStatus;
  pin: string;
  startDate: string; // ISO date
  customerIds: string[];
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

export interface Shift {
  id: string;
  employeeId: string | null;
  customerId: string;
  date: string; // ISO date
  start: string; // HH:MM
  end: string; // HH:MM
  pause: number; // minutes
  status: ShiftStatus;
  notes: string;
}

export type AbsenceType = 'Urlaub' | 'Krankheit' | 'Unbezahlt' | 'Sonstiges';
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
  | 'absence'
  | 'location'
  | 'reports'
  | 'settings'
  | 'permissions'
  | 'me-start'
  | 'me-schedule'
  | 'me-time'
  | 'me-absence'
  | 'me-profile';

export interface FilterState {
  teEmp?: string;
  teCust?: string;
  teStatus?: string;
  tePeriod?: string;
  schedStandort?: string;
  schedEmp?: string;
  empSearch?: string;
  absStatus?: string;
  reportPeriod?: 'week' | 'month';
  permRole?: 'manager' | 'mitarbeiter';
  meSchedTab?: 'day' | 'week' | 'open';
}

export interface AppData {
  employees: Employee[];
  customers: Customer[];
  shifts: Shift[];
  absences: Absence[];
  timeEntries: TimeEntry[];
  timeCorrections: TimeCorrection[];
  settings: Settings;
  permissions: PermissionsMap;
}
