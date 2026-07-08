import React from 'react';
import type { Shift } from '../types';
import { useApp } from '../state/AppContext';
import { getCust, getEmp, shiftDisplayStatus } from '../state/selectors';
import { StatusBadge } from './ui/Badge';
import { Icon } from './icons/Icon';
import { colorFor, initials } from '../utils/format';

export function ShiftCard({ shift, conflictIds }: { shift: Shift; conflictIds: Set<string> }) {
  const { state, actions } = useApp();
  const e = getEmp(state, shift.employeeId);
  const c = getCust(state, shift.customerId);
  const accent = c ? colorFor(c.id) : '#8A9A97';
  const dispStatus = shiftDisplayStatus(shift, conflictIds);
  const isConflict = dispStatus === 'konflikt';
  const isOpen = !e;

  return (
    <div
      className={`shift-card ${isConflict ? 'is-conflict' : ''} ${isOpen ? 'is-open' : ''}`}
      style={{ borderLeftColor: accent }}
      onClick={() => actions.openShiftPanel(shift.id)}
    >
      <div className="shift-card-top">
        <span className="mono shift-time">
          {shift.start}–{shift.end}
        </span>
        <StatusBadge status={dispStatus} />
      </div>
      <div className="shift-card-who">
        {e ? (
          <>
            <div className="avatar" style={{ background: colorFor(e.id), width: 22, height: 22, fontSize: 9.5 }}>
              {initials(e.name)}
            </div>
            <span>{e.name}</span>
          </>
        ) : (
          <span className="open-flag">
            <Icon name="bolt" /> Offen – Mitarbeiter gesucht
          </span>
        )}
      </div>
      <div className="shift-card-meta">
        <span>{c ? c.name : '–'}</span>
        {shift.pause ? <span>· {shift.pause} Min. Pause</span> : null}
      </div>
    </div>
  );
}
