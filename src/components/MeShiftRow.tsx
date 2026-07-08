import React from 'react';
import type { Shift } from '../types';
import { useApp } from '../state/AppContext';
import { computeConflictIds, getCust, shiftDisplayStatus } from '../state/selectors';
import { StatusBadge } from './ui/Badge';
import { colorFor } from '../utils/format';

export function MeShiftRow({ shift }: { shift: Shift }) {
  const { state, actions } = useApp();
  const c = getCust(state, shift.customerId);
  const conflictIds = computeConflictIds(state.shifts);
  const accent = c ? colorFor(c.id) : '#8A9A97';

  return (
    <div className="me-shift-row" onClick={() => actions.openShiftPanel(shift.id)}>
      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 3, background: accent }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
            {shift.start}–{shift.end}
          </span>
          <StatusBadge status={shiftDisplayStatus(shift, conflictIds)} />
        </div>
        <div className="hint" style={{ marginTop: 3 }}>
          {c ? c.name : '–'}
          {shift.pause ? ` · ${shift.pause} Min. Pause` : ''}
        </div>
        {shift.notes ? (
          <div className="hint" style={{ marginTop: 2, fontStyle: 'italic' }}>
            {shift.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}
