import React, { useMemo, useState } from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { computeConflictIds, getCust, getEmp, shiftDisplayStatus } from '../state/selectors';
import { Icon } from '../components/icons/Icon';
import { ScheduleMatrix } from '../components/ScheduleMatrix';
import { Drawer } from '../components/ui/Overlay';
import { Empty } from '../components/ui/Empty';
import { ShiftStatusBadge, shiftStatusColor } from '../components/ui/Badge';
import { colorFor, initials } from '../utils/format';
import { addDays, buildMonthWeeks, fmtDate, isoDate, mondayFromWeekInput, mondayOf, WEEKDAYS, weekInputValue } from '../utils/date';
import type { Employee } from '../types';

/** Builds an inclusive array of days between start and end, capped so a mistyped range can't blow up the DOM. */
function daysBetween(start: Date, end: Date, maxDays = 92): Date[] {
  const days: Date[] = [];
  let cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last && days.length < maxDays) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

const VIEW_TABS = [
  { id: 'day', label: 'Tag' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
  { id: 'employee', label: 'Mitarbeiter' },
  { id: 'list', label: 'Liste' },
] as const;

/**
 * Admin/Manager „Schichtplan": in jeder Kalenderansicht (Tag/Woche/Monat/Mitarbeiter) dieselbe Struktur
 * — Mitarbeiter fest links (ScheduleMatrix, siehe dort), Tage/Zellen rechts, „+" pro Zelle, Drag & Drop.
 * Nur die Listenansicht bleibt bewusst eine flache Tabelle ohne Mitarbeiterspalte.
 */
export function SchedulePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const f = state.filter;
  const view = f.schedView ?? 'week';
  const canEdit = hasPerm('schedule_edit');
  const canCreate = hasPerm('schedule_create');
  const todayIso = isoDate(new Date());

  // --- Mitarbeitersuche + „Team" (Rolle) — wirkt zusätzlich zu den bestehenden Filtern (Standort/Mitarbeiter). ---
  const searchQuery = (f.schedSearch ?? '').trim().toLowerCase();
  const roleOptions = useMemo(() => [...new Set(state.employees.map((e) => e.role).filter(Boolean))].sort(), [state.employees]);
  const employeeMatchesSearch = (e: Employee) => {
    if (f.schedRole && f.schedRole !== 'alle' && e.role !== f.schedRole) return false;
    if (!searchQuery) return true;
    return `${e.name} ${e.role} ${e.email}`.toLowerCase().includes(searchQuery);
  };
  const searchActive = !!searchQuery || !!(f.schedRole && f.schedRole !== 'alle');
  const resetSearch = () => actions.setFilter({ schedSearch: undefined, schedRole: undefined });

  const filteredShifts = state.shifts.filter(
    (s) =>
      (!f.schedStandort || f.schedStandort === 'alle' || s.customerId === f.schedStandort) &&
      (!f.schedEmp || f.schedEmp === 'alle' || s.employeeId === f.schedEmp)
  );
  const conflictIds = computeConflictIds(state.shifts);
  const customerName = (id: string) => getCust(state, id)?.name ?? '–';

  // Übernimmt die aktuell gesetzten Filter (Mitarbeiter/Objekt) in den "Neue Schicht"-Dialog.
  const newShiftPayload = (date?: string, employeeId?: string | null) => ({
    date,
    employeeId: employeeId !== undefined ? employeeId ?? undefined : f.schedEmp && f.schedEmp !== 'alle' ? f.schedEmp : undefined,
    customerId: f.schedStandort && f.schedStandort !== 'alle' ? f.schedStandort : undefined,
  });
  const onCellCreate = (employeeId: string | null, iso: string) => actions.openModal('shift', newShiftPayload(iso, employeeId));
  const onMove = (id: string, newDate: string, newEmployeeId: string | null) => actions.moveShiftTo(id, newDate, newEmployeeId);

  // --- Frei wählbarer Zeitraum (für Mitarbeiter-, Monats- und Listenansicht) ---
  const [rangeFromDraft, setRangeFromDraft] = useState(f.schedRangeFrom ?? '');
  const [rangeToDraft, setRangeToDraft] = useState(f.schedRangeTo ?? '');
  const applyRange = () => actions.setFilter({ schedRangeFrom: rangeFromDraft || undefined, schedRangeTo: rangeToDraft || undefined });
  const resetRange = () => {
    setRangeFromDraft('');
    setRangeToDraft('');
    actions.setFilter({ schedRangeFrom: undefined, schedRangeTo: undefined });
  };
  const hasCustomRange = !!(f.schedRangeFrom || f.schedRangeTo);
  // Monatsansicht: Zeitraum filtert nur zusätzlich, wenn gesetzt (kein Zeitraum = ganzer Monat).
  const inMonthRange = (iso: string) => (!f.schedRangeFrom || iso >= f.schedRangeFrom) && (!f.schedRangeTo || iso <= f.schedRangeTo);
  // Mitarbeiter-/Listenansicht brauchen immer ein konkretes Fenster; ohne gewählten Zeitraum gilt die aktuelle Woche.
  const defaultStart = mondayOf(new Date());
  const rangeStart = f.schedRangeFrom ? new Date(f.schedRangeFrom) : defaultStart;
  const rangeEnd = f.schedRangeTo ? new Date(f.schedRangeTo) : addDays(defaultStart, 6);
  const rangeDays = useMemo(() => daysBetween(rangeStart, rangeEnd), [rangeStart.getTime(), rangeEnd.getTime()]);
  const requestedDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
  const rangeClamped = requestedDays > rangeDays.length;

  // --- Drag & Drop in der Monats-„Simple View" (mobile Fallback): nur Datum ändert sich ---
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
  const onCardDragStart = (e: React.DragEvent, shiftId: string) => {
    e.dataTransfer.setData('text/plain', shiftId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedShiftId(shiftId);
  };
  const onCardDragEnd = () => {
    setDraggedShiftId(null);
    setDropTarget(null);
  };
  const onDayDragOver = (e: React.DragEvent, iso: string) => {
    if (!canEdit) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget !== iso) setDropTarget(iso);
  };
  const onDayDragLeave = (iso: string) => {
    setDropTarget((d) => (d === iso ? null : d));
  };
  const onDayDrop = (e: React.DragEvent, iso: string) => {
    if (!canEdit) return;
    e.preventDefault();
    setDropTarget(null);
    setDraggedShiftId(null);
    const id = e.dataTransfer.getData('text/plain');
    const shift = state.shifts.find((s) => s.id === id);
    if (shift && shift.date !== iso) actions.moveShift(id, iso);
  };

  // --- Tag-Ansicht ---
  const [dayCursor, setDayCursor] = useState(() => new Date());
  const dayIso = isoDate(dayCursor);

  // --- Woche-Ansicht ---
  const weekStart = mondayOf(addDays(new Date(), state.weekOffset * 7));
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));
  const onWeekPick = (val: string) => {
    if (!val) return;
    const target = mondayFromWeekInput(val);
    const diffWeeks = Math.round((mondayOf(target).getTime() - mondayOf(new Date()).getTime()) / (7 * 86400000));
    actions.setWeekOffset(diffWeeks);
  };

  // --- Monat-Ansicht ---
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const monthWeeks = useMemo(() => buildMonthWeeks(monthCursor), [monthCursor]);
  const monthDays = useMemo(() => monthWeeks.flat().filter((d): d is Date => d !== null), [monthWeeks]);
  const selectedDayShifts = selectedDay ? filteredShifts.filter((s) => s.date === selectedDay).sort((a, b) => a.start.localeCompare(b.start)) : [];

  // --- Mitarbeiter-Zeilen (für alle Matrix-Ansichten: Tag/Woche/Monat/Mitarbeiter) ---
  const employeeRows = state.employees
    .filter((e) => e.status === 'aktiv' && (!f.schedEmp || f.schedEmp === 'alle' || e.id === f.schedEmp) && employeeMatchesSearch(e))
    .sort((a, b) => a.name.localeCompare(b.name));

  const rangeDayIsos = rangeDays.map((d) => isoDate(d));
  const openShiftsInRange = searchActive ? [] : filteredShifts.filter((s) => !s.employeeId && rangeDayIsos.includes(s.date));
  const openShiftsInMonth = searchActive
    ? []
    : filteredShifts.filter((s) => !s.employeeId && inMonthRange(s.date) && s.date >= isoDate(monthDays[0]) && s.date <= isoDate(monthDays[monthDays.length - 1]));
  const openShiftsOnDay = searchActive ? [] : filteredShifts.filter((s) => !s.employeeId && s.date === dayIso);
  const openShiftsInWeek = searchActive ? [] : filteredShifts.filter((s) => !s.employeeId && weekDays.some((d) => isoDate(d) === s.date));

  // --- Liste-Ansicht ---
  const listShifts = [...filteredShifts]
    .filter((s) => rangeDayIsos.includes(s.date))
    .filter((s) => !searchActive || (!!s.employeeId && employeeRows.some((e) => e.id === s.employeeId)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const noEmployeesForSearch = searchActive && !employeeRows.length;

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {VIEW_TABS.map((v) => (
            <button key={v.id} className={`tab ${view === v.id ? 'active' : ''}`} onClick={() => actions.setFilter({ schedView: v.id })}>
              {v.label}
            </button>
          ))}
        </div>
        {canCreate ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('shift', newShiftPayload())}>
            <Icon name="plus" /> Neue Schicht
          </button>
        ) : null}
      </div>

      <div className="toolbar sched-filter-bar">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search sched-emp-search">
            <Icon name="search" />
            <input
              placeholder="Mitarbeiter suchen"
              value={f.schedSearch ?? ''}
              onChange={(e) => actions.setFilter({ schedSearch: e.target.value })}
              aria-label="Mitarbeiter suchen"
            />
            {f.schedSearch ? (
              <button className="sched-search-clear" title="Suche zurücksetzen" onClick={() => actions.setFilter({ schedSearch: undefined })}>
                <Icon name="close" />
              </button>
            ) : null}
          </div>
          <select value={f.schedStandort ?? 'alle'} onChange={(e) => actions.setFilter({ schedStandort: e.target.value })}>
            <option value="alle">Alle Standorte</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {roleOptions.length > 1 ? (
            <select value={f.schedRole ?? 'alle'} onChange={(e) => actions.setFilter({ schedRole: e.target.value })}>
              <option value="alle">Alle Teams</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : null}
          <button className={`btn btn-outline btn-sm ${f.schedMoreFilters ? 'is-active' : ''}`} onClick={() => actions.setFilter({ schedMoreFilters: !f.schedMoreFilters })}>
            <Icon name={f.schedMoreFilters ? 'chevUp' : 'chevDown'} /> Weitere Filter
          </button>
        </div>
      </div>

      {f.schedMoreFilters ? (
        <div className="toolbar sched-more-filters">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="hint">Genauer Mitarbeiter (Dropdown):</span>
            <select value={f.schedEmp ?? 'alle'} onChange={(e) => actions.setFilter({ schedEmp: e.target.value })}>
              <option value="alle">Alle Mitarbeiter</option>
              {state.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sched-legend">
            <span>
              <i style={{ background: 'var(--primary)' }} /> Geplant
            </span>
            <span>
              <i style={{ background: 'var(--amber)' }} /> Offen
            </span>
            <span>
              <i style={{ background: 'var(--green)' }} /> Bestätigt
            </span>
            <span>
              <i style={{ background: 'var(--red)' }} /> Konflikt
            </span>
          </div>
        </div>
      ) : null}

      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {view === 'day' ? (
            <div className="week-nav">
              <button className="icon-btn" onClick={() => setDayCursor((d) => addDays(d, -1))}>
                <Icon name="chevL" />
              </button>
              <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 170, textAlign: 'center', fontSize: 13.5 }}>
                {WEEKDAYS[(dayCursor.getDay() + 6) % 7]}, {fmtDate(dayCursor)}
              </div>
              <button className="icon-btn" onClick={() => setDayCursor((d) => addDays(d, 1))}>
                <Icon name="chevR" />
              </button>
              {dayIso !== todayIso ? (
                <button className="btn btn-outline btn-sm" onClick={() => setDayCursor(new Date())}>
                  Heute
                </button>
              ) : null}
            </div>
          ) : null}
          {view === 'week' ? (
            <>
              <div className="week-nav">
                <button className="icon-btn" onClick={() => actions.setWeekOffset((p) => p - 1)}>
                  <Icon name="chevL" />
                </button>
                <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 150, textAlign: 'center', fontSize: 13.5 }}>
                  {fmtDate(weekStart)} – {fmtDate(addDays(weekStart, 6))}
                </div>
                <button className="icon-btn" onClick={() => actions.setWeekOffset((p) => p + 1)}>
                  <Icon name="chevR" />
                </button>
              </div>
              <input type="week" className="sched-week-input" value={weekInputValue(weekStart)} onChange={(e) => onWeekPick(e.target.value)} />
              {state.weekOffset !== 0 ? (
                <button className="btn btn-outline btn-sm" onClick={() => actions.setWeekOffset(0)}>
                  Heute
                </button>
              ) : null}
            </>
          ) : null}
          {view === 'month' ? (
            <div className="week-nav">
              <button className="icon-btn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
                <Icon name="chevL" />
              </button>
              <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 160, textAlign: 'center', fontSize: 14 }}>
                {monthCursor.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}
              </div>
              <button className="icon-btn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
                <Icon name="chevR" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {view === 'month' || view === 'employee' || view === 'list' ? (
        <div className="toolbar sched-range-bar">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="hint">Zeitraum:</span>
            <input type="date" value={rangeFromDraft} onChange={(e) => setRangeFromDraft(e.target.value)} aria-label="Startdatum" />
            <span className="hint">bis</span>
            <input type="date" value={rangeToDraft} onChange={(e) => setRangeToDraft(e.target.value)} aria-label="Enddatum" />
            <button className="btn btn-primary btn-sm" onClick={applyRange}>
              Anzeigen
            </button>
            {hasCustomRange ? (
              <button className="btn btn-ghost btn-sm" onClick={resetRange}>
                Zurücksetzen
              </button>
            ) : null}
          </div>
          {view !== 'month' ? (
            <span className="hint">
              {fmtDate(rangeStart)} – {fmtDate(rangeEnd)} {!hasCustomRange ? '(aktuelle Woche)' : ''}
              {rangeClamped ? ' · auf 92 Tage begrenzt' : ''}
            </span>
          ) : (
            <span className="hint">{hasCustomRange ? 'schränkt den Monat zusätzlich ein' : 'kein Zeitraum gesetzt – ganzer Monat sichtbar'}</span>
          )}
        </div>
      ) : null}

      {canEdit ? (
        <div className="hint" style={{ marginBottom: 12 }}>
          Schichten können per Drag &amp; Drop auf einen anderen Tag und/oder Mitarbeiter gezogen werden. Ziehen auf „Offen" hebt die Zuweisung auf.
        </div>
      ) : null}

      {noEmployeesForSearch ? (
        <Empty icon="users2" text="Kein Mitarbeiter gefunden.">
          <button className="btn btn-outline btn-sm" onClick={resetSearch}>
            Suche zurücksetzen
          </button>
        </Empty>
      ) : (
        <>
          {view === 'day' ? (
            <ScheduleMatrix
              days={[dayCursor]}
              employeeRows={employeeRows}
              openShifts={openShiftsOnDay}
              shiftsByEmployee={(empId) => filteredShifts.filter((s) => s.employeeId === empId && s.date === dayIso)}
              customerName={customerName}
              conflictIds={conflictIds}
              todayIso={todayIso}
              canEdit={canEdit}
              canCreate={canCreate}
              fluid={false}
              onCellCreate={onCellCreate}
              onOpenShift={(id) => actions.openShiftPanel(id)}
              onMove={onMove}
            />
          ) : null}

          {view === 'week' ? (
            <ScheduleMatrix
              days={weekDays}
              employeeRows={employeeRows}
              openShifts={openShiftsInWeek}
              shiftsByEmployee={(empId) => filteredShifts.filter((s) => s.employeeId === empId && weekDays.some((d) => isoDate(d) === s.date))}
              customerName={customerName}
              conflictIds={conflictIds}
              todayIso={todayIso}
              canEdit={canEdit}
              canCreate={canCreate}
              fluid={false}
              onCellCreate={onCellCreate}
              onOpenShift={(id) => actions.openShiftPanel(id)}
              onMove={onMove}
            />
          ) : null}

          {view === 'month' ? (
            <>
              <div className="month-matrix-view">
                <ScheduleMatrix
                  days={monthDays}
                  employeeRows={employeeRows}
                  openShifts={openShiftsInMonth}
                  shiftsByEmployee={(empId) => filteredShifts.filter((s) => s.employeeId === empId && inMonthRange(s.date))}
                  customerName={customerName}
                  conflictIds={conflictIds}
                  todayIso={todayIso}
                  canEdit={canEdit}
                  canCreate={canCreate}
                  fluid
                  onCellCreate={onCellCreate}
                  onOpenShift={(id) => actions.openShiftPanel(id)}
                  onMove={onMove}
                />
              </div>

              <div className="month-simple-view card">
                <div className="abs-cal-weekdays">
                  {WEEKDAYS.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
                {monthWeeks.map((week, wi) => (
                  <div className="abs-cal-week" key={wi}>
                    {week.map((day, di) => {
                      if (!day) return <div className="abs-cal-day is-blank" key={di} />;
                      const iso = isoDate(day);
                      const dShifts = inMonthRange(iso)
                        ? filteredShifts
                            .filter((s) => s.date === iso)
                            .filter((s) => !searchActive || (!!s.employeeId && employeeRows.some((e) => e.id === s.employeeId)))
                            .sort((a, b) => a.start.localeCompare(b.start))
                        : [];
                      const shown = dShifts.slice(0, 2);
                      const more = dShifts.length - shown.length;
                      return (
                        <div
                          key={di}
                          className={`abs-cal-day ${dShifts.length ? 'has-abs' : ''} ${iso === todayIso ? 'is-today' : ''} ${
                            dropTarget === iso ? 'is-drop-target' : ''
                          }`}
                          onDragOver={(e) => onDayDragOver(e, iso)}
                          onDragLeave={() => onDayDragLeave(iso)}
                          onDrop={(e) => onDayDrop(e, iso)}
                        >
                          <div className="abs-cal-day-top">
                            <span
                              className="abs-cal-day-num"
                              onClick={() => dShifts.length && setSelectedDay(iso)}
                              style={dShifts.length ? { cursor: 'pointer' } : undefined}
                            >
                              {day.getDate()}
                            </span>
                            {canCreate ? (
                              <button
                                className="abs-cal-day-add"
                                title="Neue Schicht an diesem Tag"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  actions.openModal('shift', newShiftPayload(iso));
                                }}
                              >
                                <Icon name="plus" />
                              </button>
                            ) : null}
                          </div>
                          {dShifts.length ? (
                            <div className="abs-cal-bars" onClick={() => setSelectedDay(iso)} style={{ cursor: 'pointer' }}>
                              {shown.map((s) => {
                                const dispStatus = shiftDisplayStatus(s, conflictIds);
                                return (
                                  <div
                                    key={s.id}
                                    className={`abs-cal-bar ${draggedShiftId === s.id ? 'is-dragging' : ''}`}
                                    style={{ background: shiftStatusColor(dispStatus), cursor: canEdit ? 'grab' : 'pointer' }}
                                    draggable={canEdit}
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      onCardDragStart(e, s.id);
                                    }}
                                    onDragEnd={onCardDragEnd}
                                  />
                                );
                              })}
                              {more > 0 ? <div className="abs-cal-more">+{more}</div> : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {view === 'employee' ? (
            <ScheduleMatrix
              days={rangeDays}
              employeeRows={employeeRows}
              openShifts={openShiftsInRange}
              shiftsByEmployee={(empId) => filteredShifts.filter((s) => s.employeeId === empId)}
              customerName={customerName}
              conflictIds={conflictIds}
              todayIso={todayIso}
              canEdit={canEdit}
              canCreate={canCreate}
              fluid={false}
              onCellCreate={onCellCreate}
              onOpenShift={(id) => actions.openShiftPanel(id)}
              onMove={onMove}
            />
          ) : null}

          {view === 'list' ? (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Zeit</th>
                      <th>Mitarbeiter</th>
                      <th>Objekt</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listShifts.length ? (
                      listShifts.map((s) => {
                        const e = getEmp(state, s.employeeId);
                        const c = getCust(state, s.customerId);
                        const dispStatus = shiftDisplayStatus(s, conflictIds);
                        return (
                          <tr key={s.id} onClick={() => actions.openShiftPanel(s.id)} style={{ cursor: 'pointer' }}>
                            <td>{fmtDate(new Date(s.date))}</td>
                            <td className="mono">
                              {s.start}–{s.end}
                            </td>
                            <td>
                              {e ? (
                                <div className="person">
                                  <div className="avatar" style={{ background: colorFor(e.id), width: 24, height: 24, fontSize: 10 }}>
                                    {initials(e.name)}
                                  </div>
                                  <span>{e.name}</span>
                                </div>
                              ) : (
                                <span className="hint" style={{ fontStyle: 'italic' }}>
                                  Offen – kein Mitarbeiter
                                </span>
                              )}
                            </td>
                            <td>{c ? c.name : '–'}</td>
                            <td>
                              <ShiftStatusBadge status={dispStatus} />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <Empty icon="schedule" text="Keine Schichten in diesem Zeitraum." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}

      {selectedDay ? (
        <Drawer
          title={fmtDate(new Date(selectedDay))}
          onClose={() => setSelectedDay(null)}
          footer={
            canCreate ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const d = selectedDay;
                  setSelectedDay(null);
                  actions.openModal('shift', newShiftPayload(d ?? undefined));
                }}
              >
                <Icon name="plus" /> Weitere Schicht an diesem Tag
              </button>
            ) : undefined
          }
        >
          {selectedDayShifts.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedDayShifts.map((s) => {
                const e = getEmp(state, s.employeeId);
                const c = getCust(state, s.customerId);
                const dispStatus = shiftDisplayStatus(s, conflictIds);
                return (
                  <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
                        {s.start}–{s.end}
                      </span>
                      <ShiftStatusBadge status={dispStatus} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {e ? (
                        <>
                          <div className="avatar" style={{ background: colorFor(e.id), width: 24, height: 24, fontSize: 10 }}>
                            {initials(e.name)}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 12.8 }}>{e.name}</span>
                        </>
                      ) : (
                        <span className="open-flag">
                          <Icon name="bolt" /> Offen – Mitarbeiter gesucht
                        </span>
                      )}
                    </div>
                    <div className="hint" style={{ marginBottom: 8 }}>
                      {c ? c.name : '–'}
                      {s.pause ? ` · ${s.pause} Min. Pause` : ''}
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setSelectedDay(null);
                        actions.openShiftPanel(s.id);
                      }}
                    >
                      <Icon name="edit" /> Details
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hint">Keine Schicht an diesem Tag.</div>
          )}
        </Drawer>
      ) : null}
    </>
  );
}
