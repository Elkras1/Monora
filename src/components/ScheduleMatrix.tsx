import React, { useState } from 'react';
import { Icon } from './icons/Icon';
import { Empty } from './ui/Empty';
import { shiftDisplayStatus } from '../state/selectors';
import { shiftStatusColor, shiftStatusTint } from './ui/Badge';
import { colorFor, initials } from '../utils/format';
import { WEEKDAYS, isoDate, pad } from '../utils/date';
import type { Employee, Shift } from '../types';

/** Drops the trailing ":00" so full-hour shifts read as "08–12" instead of "08:00–12:00" in tight cells. */
function shortTime(t: string): string {
  return t.endsWith(':00') ? t.slice(0, -3) : t;
}

interface Props {
  days: Date[];
  employeeRows: Employee[];
  openShifts: Shift[];
  shiftsByEmployee: (employeeId: string) => Shift[];
  customerName: (customerId: string) => string;
  conflictIds: Set<string>;
  todayIso: string;
  canEdit: boolean;
  canCreate: boolean;
  fluid: boolean;
  onCellCreate: (employeeId: string | null, iso: string) => void;
  onOpenShift: (shiftId: string) => void;
  onMove: (shiftId: string, newDate: string, newEmployeeId: string | null) => void;
}

export function ScheduleMatrix({
  days,
  employeeRows,
  openShifts,
  shiftsByEmployee,
  customerName,
  conflictIds,
  todayIso,
  canEdit,
  canCreate,
  fluid,
  onCellCreate,
  onOpenShift,
  onMove,
}: Props) {
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const startDrag = (e: React.DragEvent, shift: Shift) => {
    e.dataTransfer.setData('text/plain', shift.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedShift(shift);
  };
  const endDrag = () => {
    setDraggedShift(null);
    setDragOverKey(null);
  };

  const renderCell = (rowEmpId: string | null, iso: string, dShifts: Shift[]) => {
    const cellKey = `${rowEmpId ?? 'open'}|${iso}`;
    const isOver = dragOverKey === cellKey;
    const isOwnCell = !!draggedShift && draggedShift.date === iso && (draggedShift.employeeId ?? null) === rowEmpId;
    const sorted = [...dShifts].sort((a, b) => a.start.localeCompare(b.start));
    const shown = sorted.slice(0, 2);
    const more = sorted.length - shown.length;

    return (
      <div
        key={iso}
        className={`emp-day-cell ${iso === todayIso ? 'is-today' : ''} ${isOver && !isOwnCell ? 'is-drop-target' : ''} ${
          isOver && isOwnCell ? 'is-current-cell' : ''
        }`}
        onDragOver={(e) => {
          if (!canEdit || !draggedShift) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverKey !== cellKey) setDragOverKey(cellKey);
        }}
        onDragLeave={() => setDragOverKey((k) => (k === cellKey ? null : k))}
        onDrop={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          const id = e.dataTransfer.getData('text/plain');
          const sh = draggedShift && draggedShift.id === id ? draggedShift : null;
          setDragOverKey(null);
          setDraggedShift(null);
          if (sh && !(sh.date === iso && (sh.employeeId ?? null) === rowEmpId)) {
            onMove(id, iso, rowEmpId);
          }
        }}
      >
        {shown.map((s) => {
          const dispStatus = shiftDisplayStatus(s, conflictIds);
          return (
            <div
              key={s.id}
              className={`emp-shift-chip ${draggedShift?.id === s.id ? 'is-dragging' : ''}`}
              style={{ background: shiftStatusTint(dispStatus), borderLeftColor: shiftStatusColor(dispStatus), color: shiftStatusColor(dispStatus) }}
              draggable={canEdit}
              onDragStart={(e) => startDrag(e, s)}
              onDragEnd={endDrag}
              onClick={() => onOpenShift(s.id)}
              title={`${s.start}–${s.end} · ${customerName(s.customerId)}`}
            >
              <span className="t mono">{fluid ? `${shortTime(s.start)}–${shortTime(s.end)}` : `${s.start}–${s.end}`}</span>
              {!fluid ? <span className="c">{customerName(s.customerId)}</span> : null}
            </div>
          );
        })}
        {more > 0 ? <div className="emp-more">+{more}</div> : null}
        {!sorted.length && canCreate ? (
          <button className="emp-cell-add" title="Neue Schicht" onClick={() => onCellCreate(rowEmpId, iso)}>
            <Icon name="plus" />
          </button>
        ) : null}
      </div>
    );
  };

  if (!employeeRows.length) {
    return <Empty icon="users2" text="Keine Mitarbeiter für diesen Filter." />;
  }

  return (
    <div className="emp-sched-scroll">
      <div className={`emp-sched-grid ${fluid ? 'is-fluid' : ''}`}>
        <div className="emp-sched-row emp-sched-head">
          <div className="emp-sched-namecell">Mitarbeiter</div>
          {days.map((d) => {
            const iso = isoDate(d);
            return (
              <div key={iso} className={`emp-day-head ${iso === todayIso ? 'is-today' : ''}`}>
                {WEEKDAYS[(d.getDay() + 6) % 7]}
                <br />
                {pad(d.getDate())}
              </div>
            );
          })}
        </div>

        {openShifts.length ? (
          <div className="emp-sched-row">
            <div className="emp-sched-namecell">
              <span className="open-flag">
                <Icon name="bolt" /> Offen
              </span>
            </div>
            {days.map((d) => {
              const iso = isoDate(d);
              return renderCell(null, iso, openShifts.filter((s) => s.date === iso));
            })}
          </div>
        ) : null}

        {employeeRows.map((emp) => {
          const empShifts = shiftsByEmployee(emp.id);
          return (
            <div className="emp-sched-row" key={emp.id}>
              <div className="emp-sched-namecell">
                <div className="avatar" style={{ background: colorFor(emp.id), width: 26, height: 26, fontSize: 10.5 }}>
                  {initials(emp.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{emp.name}</div>
                  <div className="hint" style={{ fontSize: 10 }}>
                    {emp.role}
                  </div>
                </div>
              </div>
              {days.map((d) => {
                const iso = isoDate(d);
                return renderCell(emp.id, iso, empShifts.filter((s) => s.date === iso));
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
