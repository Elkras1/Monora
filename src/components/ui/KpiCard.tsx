import React from 'react';
import { Icon, IconName } from '../icons/Icon';

export function KpiCard({
  icon,
  label,
  value,
  bg,
  fg,
  delta,
  onClick,
  active,
}: {
  icon: IconName;
  label: string;
  value: React.ReactNode;
  bg: string;
  fg: string;
  delta?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div className={`card kpi ${active ? 'is-active' : ''}`} style={onClick ? { cursor: 'pointer' } : undefined} onClick={onClick}>
      <div className="icon" style={{ background: bg, color: fg }}>
        <Icon name={icon} />
      </div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta ? <div className="delta">{delta}</div> : null}
    </div>
  );
}
