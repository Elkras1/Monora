import React from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { computeConflictIds } from '../state/selectors';
import { Icon } from '../components/icons/Icon';
import { ShiftCard } from '../components/ShiftCard';
import { addDays, fmtDate, isoDate, mondayFromWeekInput, mondayOf, WEEKDAYS, weekInputValue } from '../utils/date';

function weekRange(offset: number) {
  const base = mondayOf(new Date());
  return addDays(base, offset * 7);
}

export function SchedulePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const f = state.filter;

  const filteredShifts = state.shifts.filter(
    (s) =>
      (!f.schedStandort || f.schedStandort === 'alle' || s.customerId === f.schedStandort) &&
      (!f.schedEmp || f.schedEmp === 'alle' || s.employeeId === f.schedEmp)
  );
  const conflictIds = computeConflictIds(state.shifts);
  const start = weekRange(state.weekOffset);
  const days = [...Array(7)].map((_, i) => addDays(start, i));
  const todayIso = isoDate(new Date());

  const onWeekPick = (val: string) => {
    if (!val) return;
    const target = mondayFromWeekInput(val);
    const diffWeeks = Math.round((mondayOf(target).getTime() - mondayOf(new Date()).getTime()) / (7 * 86400000));
    actions.setWeekOffset(diffWeeks);
  };

  const mobDayCandidate = days.find((d) => isoDate(d) === state.mobileDay) ? state.mobileDay : days.some((d) => isoDate(d) === todayIso) ? todayIso : isoDate(days[0]);
  const orderedDays = [...days].sort((a, b) => (isoDate(a) === todayIso ? -1 : 0) - (isoDate(b) === todayIso ? -1 : 0));
  const mobDayShifts = filteredShifts.filter((s) => s.date === mobDayCandidate).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <>
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="week-nav">
            <button className="icon-btn" onClick={() => actions.setWeekOffset((p) => p - 1)}>
              <Icon name="chevL" />
            </button>
            <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 150, textAlign: 'center', fontSize: 13.5 }}>
              {fmtDate(start)} – {fmtDate(addDays(start, 6))}
            </div>
            <button className="icon-btn" onClick={() => actions.setWeekOffset((p) => p + 1)}>
              <Icon name="chevR" />
            </button>
          </div>
          <input
            type="week"
            className="sched-week-input"
            value={weekInputValue(weekRange(state.weekOffset))}
            onChange={(e) => onWeekPick(e.target.value)}
          />
          {state.weekOffset !== 0 ? (
            <button className="btn btn-outline btn-sm" onClick={() => actions.setWeekOffset(0)}>
              Heute
            </button>
          ) : null}
          <select value={f.schedStandort ?? 'alle'} onChange={(e) => actions.setFilter({ schedStandort: e.target.value })}>
            <option value="alle">Alle Standorte</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={f.schedEmp ?? 'alle'} onChange={(e) => actions.setFilter({ schedEmp: e.target.value })}>
            <option value="alle">Alle Mitarbeiter</option>
            {state.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {hasPerm('schedule_create') ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('shift')}>
            <Icon name="plus" /> Neue Schicht
          </button>
        ) : null}
      </div>

      <div className="sched-desktop">
        <div className="cal-grid7">
          {days.map((d) => {
            const iso = isoDate(d);
            const dayShifts = filteredShifts.filter((s) => s.date === iso).sort((a, b) => a.start.localeCompare(b.start));
            const isToday = iso === todayIso;
            return (
              <div key={iso} className={`cal-col ${isToday ? 'is-today' : ''}`}>
                <div className="cal-col-head">
                  <span>{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
                  <span className="d">
                    {d.getDate()}.{d.getMonth() + 1}.
                  </span>
                  {isToday ? <span className="today-dot" /> : null}
                </div>
                <div className="cal-col-body">
                  {dayShifts.length ? (
                    dayShifts.map((s) => <ShiftCard key={s.id} shift={s} conflictIds={conflictIds} />)
                  ) : (
                    <div className="cal-empty-hint">Keine Schichten geplant</div>
                  )}
                </div>
                {hasPerm('schedule_create') ? (
                  <button className="cal-add-day" onClick={() => actions.openModal('shift', { date: iso })}>
                    <Icon name="plus" /> Schicht
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sched-mobile">
        <div className="day-tabs">
          {orderedDays.map((d) => {
            const iso = isoDate(d);
            const isToday = iso === todayIso;
            return (
              <button
                key={iso}
                className={`day-tab ${iso === mobDayCandidate ? 'active' : ''}`}
                onClick={() => actions.setMobileDay(iso)}
              >
                {isToday ? 'Heute' : WEEKDAYS[(d.getDay() + 6) % 7]}
                <span>
                  {d.getDate()}.{d.getMonth() + 1}.
                </span>
              </button>
            );
          })}
        </div>
        <div className="mob-day-list">
          {mobDayShifts.length ? (
            mobDayShifts.map((s) => <ShiftCard key={s.id} shift={s} conflictIds={conflictIds} />)
          ) : (
            <div className="cal-empty-hint" style={{ padding: '26px 0', textAlign: 'center' }}>
              Keine Schichten für diesen Tag geplant
            </div>
          )}
        </div>
        {hasPerm('schedule_create') ? (
          <button className="fab" onClick={() => actions.openModal('shift', { date: mobDayCandidate })}>
            <Icon name="plus" />
          </button>
        ) : null}
      </div>
    </>
  );
}
