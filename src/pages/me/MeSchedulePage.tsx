import React from 'react';
import { useApp, useHasPerm } from '../../state/AppContext';
import { getCust } from '../../state/selectors';
import { MeShiftRow } from '../../components/MeShiftRow';
import { StatusBadge } from '../../components/ui/Badge';
import { Empty } from '../../components/ui/Empty';
import { Icon } from '../../components/icons/Icon';
import { addDays, isoDate, mondayOf, WEEKDAYS } from '../../utils/date';
import { colorFor } from '../../utils/format';

export function MeSchedulePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const tab = state.filter.meSchedTab ?? 'week';
  const mine = state.shifts.filter((s) => s.employeeId === state.currentUserId);
  const openShifts = hasPerm('schedule_open_view') ? state.shifts.filter((s) => !s.employeeId) : [];
  const todayIso = isoDate(new Date());
  const weekStart = mondayOf(new Date());
  const days = [...Array(7)].map((_, i) => addDays(weekStart, i));

  return (
    <>
      <div className="tabs" style={{ marginBottom: 14 }}>
        <button className={`tab ${tab === 'day' ? 'active' : ''}`} onClick={() => actions.setFilter({ meSchedTab: 'day' })}>
          Heute
        </button>
        <button className={`tab ${tab === 'week' ? 'active' : ''}`} onClick={() => actions.setFilter({ meSchedTab: 'week' })}>
          Woche
        </button>
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
