import React from 'react';
import { Drawer } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { StatusBadge } from './ui/Badge';
import { useApp, useHasPerm } from '../state/AppContext';
import { computeConflictIds, getCust, getEmp, shiftDisplayStatus } from '../state/selectors';
import { colorFor, initials } from '../utils/format';
import { fmtDate } from '../utils/date';

export function ShiftPanel() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const shift = state.shifts.find((s) => s.id === state.panelShiftId);
  if (!shift) return null;
  const e = getEmp(state, shift.employeeId);
  const c = getCust(state, shift.customerId);
  const conflictIds = computeConflictIds(state.shifts);
  const dispStatus = shiftDisplayStatus(shift, conflictIds);

  const canDelete = hasPerm('schedule_delete');
  const canCreate = hasPerm('schedule_create');
  const canEdit = hasPerm('schedule_edit');

  return (
    <Drawer
      title="Schichtdetails"
      onClose={() => actions.closeShiftPanel()}
      footer={
        <>
          {canDelete ? (
            <button className="btn btn-danger" onClick={() => actions.deleteShift(shift.id)}>
              <Icon name="trash" /> Löschen
            </button>
          ) : null}
          {canCreate ? (
            <button className="btn btn-outline" onClick={() => actions.duplicateShift(shift.id)}>
              Duplizieren
            </button>
          ) : null}
          {canEdit ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                actions.closeShiftPanel();
                actions.openModal('shift', shift);
              }}
            >
              <Icon name="edit" /> Bearbeiten
            </button>
          ) : null}
          {!canDelete && !canCreate && !canEdit ? <span className="hint">Nur Ansicht – keine Bearbeitungsrechte.</span> : null}
        </>
      }
    >
      {dispStatus === 'konflikt' ? (
        <div className="warn-box" style={{ marginBottom: 16 }}>
          <Icon name="close" /> Diese Schicht überschneidet sich mit einer anderen Schicht desselben Mitarbeiters.
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        {e ? (
          <div className="avatar" style={{ background: colorFor(e.id), width: 40, height: 40, fontSize: 14 }}>
            {initials(e.name)}
          </div>
        ) : (
          <div className="avatar" style={{ background: 'var(--ink-faint)', width: 40, height: 40 }}>
            ?
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15.5 }}>{e ? e.name : 'Offen – kein Mitarbeiter'}</div>
          <div className="hint">{e ? e.role : 'Diese Schicht muss noch besetzt werden'}</div>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <span className="dl">Datum</span>
          <span className="dv">{fmtDate(new Date(shift.date))}</span>
        </div>
        <div>
          <span className="dl">Status</span>
          <span className="dv">
            <StatusBadge status={dispStatus} />
          </span>
        </div>
        <div>
          <span className="dl">Startzeit</span>
          <span className="dv mono">{shift.start}</span>
        </div>
        <div>
          <span className="dl">Endzeit</span>
          <span className="dv mono">{shift.end}</span>
        </div>
        <div>
          <span className="dl">Pause</span>
          <span className="dv">{shift.pause || 0} Min.</span>
        </div>
        <div>
          <span className="dl">Standort</span>
          <span className="dv">{c ? c.name : '–'}</span>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <span className="dl">Notiz</span>
          <span className="dv">{shift.notes || '–'}</span>
        </div>
      </div>
    </Drawer>
  );
}
