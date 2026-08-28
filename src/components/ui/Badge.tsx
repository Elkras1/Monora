import React from 'react';

type BadgeVariant = 'green' | 'mint' | 'amber' | 'red' | 'blue' | 'grey';

const STATUS_MAP: Record<string, [BadgeVariant, string]> = {
  geplant: ['green', 'Geplant'],
  erledigt: ['mint', 'Erledigt'],
  offen: ['amber', 'Offen'],
  bestätigt: ['mint', 'Bestätigt'],
  konflikt: ['red', 'Konflikt'],
  korrigiert: ['blue', 'Korrigiert'],
  genehmigt: ['mint', 'Genehmigt'],
  beantragt: ['amber', 'Ausstehend'],
  abgelehnt: ['red', 'Abgelehnt'],
};

// Ferien/Urlaub = Rot, Krankheit/Unfall = Gelb, Sonstiges (inkl. Unbezahlt) = Grau
const ABS_TYPE_MAP: Record<string, BadgeVariant> = {
  Urlaub: 'red',
  Krankheit: 'amber',
  Unfall: 'amber',
  Unbezahlt: 'grey',
  Sonstiges: 'grey',
};

const ABS_TYPE_LABELS: Record<string, string> = {
  Urlaub: 'Ferien',
  Krankheit: 'Krankheit',
  Unfall: 'Unfall',
  Unbezahlt: 'Unbezahlt',
  Sonstiges: 'Sonstiges',
};

export function absenceTypeVariant(type: string): BadgeVariant {
  return ABS_TYPE_MAP[type] || 'grey';
}

export function absenceTypeLabel(type: string): string {
  return ABS_TYPE_LABELS[type] || type;
}

// Kurzform für enge Kalender-/Dienstplanzellen, z.B. "Krank 50%" statt "Krankheit · 50%".
const ABS_TYPE_SHORT_LABELS: Record<string, string> = {
  Urlaub: 'Ferien',
  Krankheit: 'Krank',
  Unfall: 'Unfall',
  Unbezahlt: 'Unbezahlt',
  Sonstiges: 'Sonstiges',
};

export function absenceTypeShortLabel(type: string): string {
  return ABS_TYPE_SHORT_LABELS[type] || type;
}

/** Kompakte Beschriftung für Kalender/Dienstplan: Typ (+ Ausfallgrad, sofern < 100 %). Bei 100 % bewusst
 * ohne "100%"-Zusatz, damit die Ansicht übersichtlich bleibt. */
export function absenceCompactLabel(type: string, percentage: number): string {
  return percentage < 100 ? `${absenceTypeShortLabel(type)} ${percentage}%` : absenceTypeShortLabel(type);
}

/** Raw CSS color (not a badge) for the absence calendar's day markers/bars. */
export function absenceTypeColor(type: string): string {
  const variant = absenceTypeVariant(type);
  if (variant === 'red') return 'var(--red)';
  if (variant === 'amber') return 'var(--amber)';
  return 'var(--ink-faint)';
}

/** Leichter Tint-Hintergrund passend zu absenceTypeColor, z.B. für Ausfall-Chips im Dienstplan. */
export function absenceTypeTint(type: string): string {
  const variant = absenceTypeVariant(type);
  if (variant === 'red') return 'var(--red-tint)';
  if (variant === 'amber') return 'var(--amber-tint)';
  return 'var(--surface-alt)';
}

// Dienstplan-Farbcode: geplant = Blau, offen = Orange, bestätigt = Grün, Konflikt = Rot
export function shiftStatusColor(status: string): string {
  if (status === 'geplant') return 'var(--primary)';
  if (status === 'offen') return 'var(--amber)';
  if (status === 'bestätigt') return 'var(--green)';
  if (status === 'konflikt') return 'var(--red)';
  return 'var(--ink-faint)';
}

export function shiftStatusTint(status: string): string {
  if (status === 'geplant') return 'var(--primary-tint)';
  if (status === 'offen') return 'var(--amber-tint)';
  if (status === 'bestätigt') return 'var(--green-tint)';
  if (status === 'konflikt') return 'var(--red-tint)';
  return 'var(--surface-alt)';
}

// Tickets: Status- und Prioritäts-Badges/-Farben — bewusst nur noch zwei Zustände (siehe TicketStatus).
const TICKET_STATUS_MAP: Record<string, [BadgeVariant, string]> = {
  offen: ['blue', 'Offen'],
  erledigt: ['mint', 'Erledigt'],
};

const TICKET_PRIORITY_MAP: Record<string, [BadgeVariant, string]> = {
  niedrig: ['grey', 'Niedrig'],
  normal: ['blue', 'Normal'],
  hoch: ['amber', 'Hoch'],
  dringend: ['red', 'Dringend'],
};

export function ticketStatusLabel(status: string): string {
  return TICKET_STATUS_MAP[status]?.[1] || status;
}

export function ticketPriorityLabel(priority: string): string {
  return TICKET_PRIORITY_MAP[priority]?.[1] || priority;
}

/** Kalenderfarbe: Offen=Blau, Erledigt=Grün — dringende, noch offene Tickets werden unabhängig vom Status
 * rot hervorgehoben (siehe Ticket-Kalender). */
export function ticketStatusColor(status: string): string {
  if (status === 'erledigt') return 'var(--green)';
  return 'var(--primary)';
}

export function ticketCalendarColor(status: string, priority: string): string {
  if (priority === 'dringend' && status !== 'erledigt') return 'var(--red)';
  return ticketStatusColor(status);
}

/** CSS-Klasse für die GESAMTE Ticketfläche (ganze Zeile/Karte, nicht nur Titel/Badge), abhängig von der
 * Fälligkeits-Dringlichkeit (siehe ticketUrgency in state/selectors.ts) — bewusst getrennt von
 * ticketStatusColor, das den Bearbeitungsstatus meint, nicht die Fälligkeit. Gilt für die vollständige
 * Ticketliste (TicketsPage.tsx). Das Dashboard nutzt eine eigene, unabhängige Palette — siehe
 * dashboardUrgencyRowClass weiter unten. "später" (mehr als 1 Tag Zeit / kein Fälligkeitsdatum)
 * bekommt den ruhigen, neutralen Ton. */
export function ticketUrgencyRowClass(urgency: string): string {
  if (urgency === 'overdue') return 'tick-urgency-overdue';
  if (urgency === 'today') return 'tick-urgency-today';
  if (urgency === 'soon') return 'tick-urgency-soon';
  if (urgency === 'done') return 'tick-urgency-done';
  return 'tick-urgency-later';
}

/** Dashboard-eigene Fälligkeitsfarbe für die Ticket- UND Materialanfragen-To-do-Liste (siehe
 * DashboardWorkList.tsx) — bewusst EINE gemeinsame Funktion/Klassenfamilie (.dash-tick-urgency-*), getrennt
 * von ticketUrgencyRowClass/.tick-urgency-* oben, damit ein Farbwunsch nur fürs Dashboard die vollständige
 * Ticketliste nicht mitverändert. Tickets und Materialanfragen nutzen hier bewusst dieselbe Palette (siehe
 * ticketUrgency/materialUrgency in state/selectors.ts), damit beide Bereiche als parallele Arbeitslisten
 * wirken. Das Dashboard zeigt ohnehin nur offene Vorgänge, daher kein eigener "done"-Zweig nötig. */
export function dashboardUrgencyRowClass(urgency: string): string {
  if (urgency === 'overdue') return 'dash-tick-urgency-overdue';
  if (urgency === 'today') return 'dash-tick-urgency-today';
  if (urgency === 'soon') return 'dash-tick-urgency-soon';
  return 'dash-tick-urgency-normal';
}

export function TicketStatusBadge({ status }: { status: string }) {
  const [variant, label] = TICKET_STATUS_MAP[status] || ['grey', status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  const [variant, label] = TICKET_PRIORITY_MAP[priority] || ['grey', priority];
  return <Badge variant={variant}>{label}</Badge>;
}

// Bewusst nur noch zwei Zustände (siehe MaterialRequestStatus).
const MATERIAL_STATUS_MAP: Record<string, [BadgeVariant, string]> = {
  offen: ['blue', 'Offen'],
  erledigt: ['mint', 'Erledigt'],
};

export function materialStatusLabel(status: string): string {
  return MATERIAL_STATUS_MAP[status]?.[1] || status;
}

export function MaterialStatusBadge({ status }: { status: string }) {
  const [variant, label] = MATERIAL_STATUS_MAP[status] || ['grey', status];
  return <Badge variant={variant}>{label}</Badge>;
}

const ISSUE_MAP: Record<string, [BadgeVariant, string]> = {
  offen: ['red', 'Offen'],
  'in Bearbeitung': ['amber', 'In Bearbeitung'],
  erledigt: ['mint', 'Erledigt'],
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`badge badge-${variant}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const [variant, label] = STATUS_MAP[status] || ['grey', status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function AbsenceTypeBadge({ type }: { type: string }) {
  return <span className={`badge badge-${absenceTypeVariant(type)}`}>{absenceTypeLabel(type)}</span>;
}

const SHIFT_STATUS_LABELS: Record<string, string> = { geplant: 'Geplant', offen: 'Offen', bestätigt: 'Bestätigt', konflikt: 'Konflikt' };

/** Status pill for the Dienstplan that always matches the schedule's own colour code (blue/orange/green/red), independent of the shared badge palette. */
export function ShiftStatusBadge({ status }: { status: string }) {
  return (
    <span className="badge" style={{ background: shiftStatusTint(status), color: shiftStatusColor(status) }}>
      <span className="badge-dot" style={{ background: shiftStatusColor(status) }} />
      {SHIFT_STATUS_LABELS[status] || status}
    </span>
  );
}

export function IssueBadge({ status }: { status: string }) {
  const [variant, label] = ISSUE_MAP[status] || ['grey', status];
  return <Badge variant={variant}>{label}</Badge>;
}
