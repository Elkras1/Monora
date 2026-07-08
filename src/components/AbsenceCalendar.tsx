import React, { useMemo, useState } from 'react';
import { Drawer } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { AbsenceTypeBadge, StatusBadge, absenceTypeColor } from './ui/Badge';
import { useApp } from '../state/AppContext';
import { getEmp } from '../state/selectors';
import type { Absence } from '../types';
import { fmtDate, isoDate, WEEKDAYS } from '../utils/date';

function absencesOnDay(absences: Absence[], iso: string): Absence[] {
  return absences.filter((a) => a.start <= iso && iso <= a.end);
}

function buildMonthWeeks(monthCursor: Date): (Date | null)[][] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const cells: (Date | null)[] = [...Array(leadingBlanks)].map(() => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function AbsenceCalendar({ absences, mode }: { absences: Absence[]; mode: 'month' | 'year' }) {
  const { state } = useApp();
  const todayIso = isoDate(new Date());
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [yearCursor, setYearCursor] = useState(() => new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const weeks = useMemo(() => buildMonthWeeks(monthCursor), [monthCursor]);
  const dayDetail = selectedDay ? absencesOnDay(absences, selectedDay) : [];

  return (
    <div>
      {mode === 'month' ? (
        <>
          <div className="week-nav" style={{ marginBottom: 14 }}>
            <button
              className="icon-btn"
              onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            >
              <Icon name="chevL" />
            </button>
            <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 160, textAlign: 'center', fontSize: 14 }}>
              {monthCursor.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}
            </div>
            <button
              className="icon-btn"
              onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            >
              <Icon name="chevR" />
            </button>
          </div>
          <div className="abs-cal-weekdays">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div className="abs-cal-week" key={wi}>
              {week.map((day, di) => {
                if (!day) return <div className="abs-cal-day is-blank" key={di} />;
                const iso = isoDate(day);
                const dayAbsences = absencesOnDay(absences, iso);
                const hasAbs = dayAbsences.length > 0;
                const shown = dayAbsences.slice(0, 2);
                const more = dayAbsences.length - shown.length;
                return (
                  <div
                    key={di}
                    className={`abs-cal-day ${hasAbs ? 'has-abs' : ''} ${iso === todayIso ? 'is-today' : ''}`}
                    onClick={() => hasAbs && setSelectedDay(iso)}
                  >
                    <div className="abs-cal-day-num">{day.getDate()}</div>
                    {hasAbs ? (
                      <div className="abs-cal-bars">
                        {shown.map((a) => (
                          <div key={a.id} className="abs-cal-bar" style={{ background: absenceTypeColor(a.type) }} />
                        ))}
                        {more > 0 ? <div className="abs-cal-more">+{more}</div> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="week-nav" style={{ marginBottom: 14 }}>
            <button className="icon-btn" onClick={() => setYearCursor((y) => y - 1)}>
              <Icon name="chevL" />
            </button>
            <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 80, textAlign: 'center', fontSize: 14 }}>
              {yearCursor}
            </div>
            <button className="icon-btn" onClick={() => setYearCursor((y) => y + 1)}>
              <Icon name="chevR" />
            </button>
          </div>
          <div className="abs-year-grid">
            {[...Array(12)].map((_, m) => {
              const daysInMonth = new Date(yearCursor, m + 1, 0).getDate();
              const monthName = new Date(yearCursor, m, 1).toLocaleDateString('de-CH', { month: 'long' });
              return (
                <div className="abs-year-month" key={m}>
                  <h4>{monthName}</h4>
                  <div className="abs-year-strip">
                    {[...Array(daysInMonth)].map((__, d) => {
                      const iso = isoDate(new Date(yearCursor, m, d + 1));
                      const dayAbsences = absencesOnDay(absences, iso);
                      const hasAbs = dayAbsences.length > 0;
                      return (
                        <div
                          key={d}
                          className={`abs-year-tick ${hasAbs ? 'has-abs' : ''}`}
                          style={hasAbs ? { background: absenceTypeColor(dayAbsences[0].type) } : undefined}
                          title={`${d + 1}. ${monthName}`}
                          onClick={() => hasAbs && setSelectedDay(iso)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedDay ? (
        <Drawer title={fmtDate(new Date(selectedDay))} onClose={() => setSelectedDay(null)}>
          {dayDetail.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayDetail.map((a) => {
                const emp = getEmp(state, a.employeeId);
                return (
                  <div key={a.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{emp?.name ?? '–'}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <AbsenceTypeBadge type={a.type} />
                    </div>
                    <div className="hint">
                      {fmtDate(new Date(a.start))} – {fmtDate(new Date(a.end))}
                    </div>
                    {a.note ? <div className="hint" style={{ marginTop: 4 }}>{a.note}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hint">Keine Abwesenheit an diesem Tag.</div>
          )}
        </Drawer>
      ) : null}
    </div>
  );
}
