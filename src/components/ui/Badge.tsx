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

export function IssueBadge({ status }: { status: string }) {
  const [variant, label] = ISSUE_MAP[status] || ['grey', status];
  return <Badge variant={variant}>{label}</Badge>;
}
