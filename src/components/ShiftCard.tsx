import React from 'react';
import type { Shift } from '../types';
import { useApp } from '../state/AppContext';
import { getCust, getEmp, shiftDisplayStatus } from '../state/selectors';
import { ShiftStatusBadge } from './ui/Badge';
import { Icon } from './icons/Icon';
import { colorFor, initials } from '../utils/format';

export function ShiftCard({
  shift,
  conflictIds,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  shift: Shift;
  conflictIds: Set<string>;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: (e: React.DragEvent, shift: Shift) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const { state, actions } = useApp();
  const e = getEmp(state, shift.employeeId);
  const c = getCust(state, shift.customerId);
  const dispStatus = shiftDisplayStatus(shift, conflictIds);
  const isConflict = dispStatus === 'konflikt';
  const isOpen = !e;
  const statusClass = isConflict ? 'is-conflict' : isOpen ? 'is-open' : dispStatus === 'bestätigt' ? 'is-confirmed' : 'is-planned';

  return (
    <div
      className={`shift-card ${statusClass} ${dragging ? 'is-dragging' : ''}`}
      draggable={draggable}
      onDragStart={(ev) => onDragStart?.(ev, shift)}
      onDragEnd={onDragEnd}
      onClick={() => actions.openShiftPanel(shift.id)}
    >
      <div className="shift-card-top">
        <span className="mono shift-time">
          {shift.start}–{shift.end}
        </span>
        <ShiftStatusBadge status={dispStatus} />
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
