import React, { useMemo, useState } from 'react';
import { useApp, useHasPerm } from '../../state/AppContext';
import { getCust } from '../../state/selectors';
import { MeShiftRow } from '../../components/MeShiftRow';
import { StatusBadge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { Drawer } from '../../components/ui/Overlay';
import { Icon } from '../../components/icons/Icon';
import { addDays, buildMonthWeeks, fmtDate, isoDate, mondayOf, WEEKDAYS } from '../../utils/date';
import { colorFor } from '../../utils/format';

const TABS = [
  { id: 'day', label: 'Heute' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
  { id: 'list', label: 'Liste' },
] as const;

export function MeSchedulePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const tab = state.filter.meSchedTab ?? 'week';
  const mine = state.shifts.filter((s) => s.employeeId === state.currentUserId);
  const openShifts = hasPerm('schedule_open_view') ? state.shifts.filter((s) => !s.employeeId) : [];
  const todayIso = isoDate(new Date());
  const weekStart = mondayOf(new Date());
  const days = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const monthWeeks = useMemo(() => buildMonthWeeks(monthCursor), [monthCursor]);
  const [dayListIso, setDayListIso] = useState<string | null>(null);

  return (
    <>
      <div className="tabs" style={{ marginBottom: 14 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => actions.setFilter({ meSchedTab: t.id })}>
            {t.label}
          </button>
        ))}
        {hasPerm('schedule_open_view') ? (
          <button className={`tab ${tab === 'open' ? 'active' : ''}`} onClick={() => actions.setFilter({ meSchedTab: 'open' })}>
            Offene Schichten
          </button>
        ) : null}
      </div>

      {tab === 'day'
        ? (() => {
            const todays = mine.filter((s) => s.date === todayIso).sort((a, b) => a.start.localeCompare(b.start));
            return todays.length ? todays.map((s) => <MeShiftRow key={s.id} shift={s} />) : <Empty icon="schedule" text="Heute ist keine Schicht für dich geplant." />;
          })()
        : null}

      {tab === 'week'
        ? days.map((d) => {
            const iso = isoDate(d);
            const dayShifts = mine.filter((s) => s.date === iso).sort((a, b) => a.start.localeCompare(b.start));
            return (
              <div key={iso} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", fontSize: 13, marginBottom: 6, color: iso === todayIso ? 'var(--primary-dark)' : 'var(--ink)' }}>
                  {WEEKDAYS[(d.getDay() + 6) % 7]}, {d.getDate()}.{d.getMonth() + 1}.{iso === todayIso ? ' · Heute' : ''}
                </div>
                {dayShifts.length ? dayShifts.map((s) => <MeShiftRow key={s.id} shift={s} />) : <div className="cal-empty-hint">Keine Schicht</div>}
              </div>
            );
          })
        : null}

      {tab === 'month' ? (
        <>
          <div className="week-nav" style={{ marginBottom: 14 }}>
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
                const dayShifts = mine.filter((s) => s.date === iso).sort((a, b) => a.start.localeCompare(b.start));
                const shown = dayShifts.slice(0, 2);
                const more = dayShifts.length - shown.length;
                return (
                  <div key={di} className={`abs-cal-day me-month-day ${dayShifts.length ? 'has-abs' : ''} ${iso === todayIso ? 'is-today' : ''}`}>
                    <div className="abs-cal-day-num">{day.getDate()}</div>
                    {dayShifts.length ? (
                      <div className="me-month-chips">
                        {shown.map((s) => {
                          const c = getCust(state, s.customerId);
                          const accent = c ? colorFor(c.id) : '#8A9A97';
                          return (
                            <div
                              key={s.id}
                              className="me-month-chip"
                              style={{ background: `${accent}1f`, borderLeftColor: accent }}
                              onClick={() => actions.openMyShiftPanel(s.id)}
                            >
                              <span className="me-month-chip-time">{s.start}</span>
                              <span className="me-month-chip-obj">{c ? c.name : '–'}</span>
                            </div>
                          );
                        })}
                        {more > 0 ? (
                          <button className="me-month-more" onClick={() => setDayListIso(iso)}>
                            +{more} weitere
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      ) : null}

      {dayListIso ? (
        <Drawer title={fmtDate(new Date(dayListIso))} onClose={() => setDayListIso(null)}>
          <div onClick={() => setDayListIso(null)}>
            {mine
              .filter((s) => s.date === dayListIso)
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((s) => (
                <MeShiftRow key={s.id} shift={s} />
              ))}
          </div>
        </Drawer>
      ) : null}

      {tab === 'list'
        ? (() => {
            const sorted = [...mine].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
            if (!sorted.length) return <Empty icon="schedule" text="Keine Einsätze vorhanden." />;
            const dates = Array.from(new Set(sorted.map((s) => s.date)));
            return dates.map((iso) => {
              const d = new Date(iso);
              const dayShifts = sorted.filter((s) => s.date === iso);
              return (
                <div key={iso} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", fontSize: 13, marginBottom: 6, color: iso === todayIso ? 'var(--primary-dark)' : 'var(--ink)' }}>
                    {WEEKDAYS[(d.getDay() + 6) % 7]}, {d.getDate()}.{d.getMonth() + 1}.{d.getFullYear()}
                    {iso === todayIso ? ' · Heute' : ''}
                  </div>
                  {dayShifts.map((s) => (
                    <MeShiftRow key={s.id} shift={s} />
                  ))}
                </div>
              );
            });
          })()
        : null}

      {tab === 'open'
        ? openShifts.length
          ? openShifts.map((s) => {
              const c = getCust(state, s.customerId);
              const accent = c ? colorFor(c.id) : '#8A9A97';
              return (
                <div key={s.id} className="me-shift-row" style={{ background: 'var(--amber-tint)', borderColor: '#F0DBA0' }}>
                  <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 3, background: accent }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
                        {s.date} · {s.start}–{s.end}
                      </span>
                      <StatusBadge status="offen" />
                    </div>
                    <div className="hint" style={{ marginTop: 3 }}>
                      {c ? c.name : '–'}
                      {s.pause ? ` · ${s.pause} Min. Pause` : ''}
                    </div>
                    {hasPerm('schedule_open_claim') ? (
                      <button className="btn btn-accent btn-sm" style={{ marginTop: 8 }} onClick={() => actions.claimOpenShift(s.id)}>
                        <Icon name="check" /> Schicht übernehmen
                      </button>
                    ) : (
                      <div className="hint" style={{ marginTop: 6 }}>
                        Übernahme durch dich ist nicht freigegeben.
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          : <Empty icon="schedule" text="Aktuell keine offenen Schichten." />
        : null}
    </>
  );
}
