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

/** Raw CSS color (not a badge) for the absence calendar's day markers/bars. */
export function absenceTypeColor(type: string): string {
  const variant = absenceTypeVariant(type);
  if (variant === 'red') return 'var(--red)';
  if (variant === 'amber') return 'var(--amber)';
  return 'var(--ink-faint)';
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

// Tickets: Status- und Prioritäts-Badges/-Farben
const TICKET_STATUS_MAP: Record<string, [BadgeVariant, string]> = {
  neu: ['grey', 'Neu'],
  geplant: ['blue', 'Geplant'],
  in_bearbeitung: ['amber', 'In Bearbeitung'],
  wartet_rueckmeldung: ['amber', 'Wartet auf Rückmeldung'],
  erledigt: ['mint', 'Erledigt'],
  abgeschlossen: ['green', 'Abgeschlossen'],
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

/** Kalenderfarbe: Neu=Grau, Geplant=Blau, In Bearbeitung=Orange, Erledigt/Abgeschlossen=Grün — dringende
 * Tickets werden unabhängig vom Status rot hervorgehoben (siehe Ticket-Kalender). */
export function ticketStatusColor(status: string): string {
  if (status === 'geplant') return 'var(--primary)';
  if (status === 'in_bearbeitung') return 'var(--orange)';
  if (status === 'wartet_rueckmeldung') return 'var(--amber)';
  if (status === 'erledigt' || status === 'abgeschlossen') return 'var(--green)';
  return 'var(--ink-faint)';
}

export function ticketCalendarColor(status: string, priority: string): string {
  if (priority === 'dringend' && status !== 'erledigt' && status !== 'abgeschlossen') return 'var(--red)';
  return ticketStatusColor(status);
}

export function TicketStatusBadge({ status }: { status: string }) {
  const [variant, label] = TICKET_STATUS_MAP[status] || ['grey', status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  const [variant, label] = TICKET_PRIORITY_MAP[priority] || ['grey', priority];
  return <Badge variant={variant}>{label}</Badge>;
}

const MATERIAL_STATUS_MAP: Record<string, [BadgeVariant, string]> = {
  eingereicht: ['amber', 'Eingereicht'],
  in_bearbeitung: ['blue', 'In Bearbeitung'],
  erledigt: ['mint', 'Erledigt'],
  abgelehnt: ['red', 'Abgelehnt'],
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
