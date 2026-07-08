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

const ABS_TYPE_MAP: Record<string, BadgeVariant> = {
  Urlaub: 'green',
  Krankheit: 'red',
  Unbezahlt: 'amber',
  Sonstiges: 'grey',
};

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
  const variant = ABS_TYPE_MAP[type] || 'grey';
  return (
    <span className={`badge badge-${variant}`}>{type}</span>
  );
}

export function IssueBadge({ status }: { status: string }) {
  const [variant, label] = ISSUE_MAP[status] || ['grey', status];
  return <Badge variant={variant}>{label}</Badge>;
}
