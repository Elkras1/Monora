import React from 'react';
import { useApp } from '../state/AppContext';
import { computeConflictIds, getCust, getEmp, shiftDisplayStatus } from '../state/selectors';
import { KpiCard } from '../components/ui/KpiCard';
import { StatusBadge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { StampWidget } from '../components/StampWidget';
import { colorFor, initials } from '../utils/format';
import { addDays, fmtDate, fmtTime, isoDate, mondayOf } from '../utils/date';
import type { TimeEntryStatus } from '../types';

export function DashboardPage() {
  const { state, actions } = useApp();

  const activeNow = state.timeEntries.filter((t) => !t.clockOut);
  const activeEmp = state.employees.filter((e) => e.status === 'aktiv').length;
  const openAbsences = state.absences.filter((a) => a.status === 'beantragt').length;
  const weekStart = mondayOf(new Date());
  const weekEnd = addDays(weekStart, 7);
  const hoursWeek = state.timeEntries
    .filter((t) => t.clockOut && new Date(t.clockIn) >= weekStart && new Date(t.clockIn) < weekEnd)
    .reduce((sum, t) => sum + (new Date(t.clockOut as string).getTime() - new Date(t.clockIn).getTime()) / 3600000, 0);

  const todayIso = isoDate(new Date());
  const todaysShifts = state.shifts.filter((s) => s.date === todayIso).sort((a, b) => a.start.localeCompare(b.start));
  const teCounts: Record<TimeEntryStatus, number> = { offen: 0, bestätigt: 0, korrigiert: 0 };
  state.timeEntries.forEach((t) => {
    teCounts[t.status]++;
  });
  const conflictIds = computeConflictIds(state.shifts);

  const upcomingAbsences = state.absences
    .filter((a) => a.status !== 'abgelehnt' && addDays(new Date(a.end), 1) >= new Date())
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);

  const onPauseCount = activeNow.filter((t) => t.pauseStart).length;
  const openTodayCount = state.timeEntries.filter((t) => isoDate(new Date(t.clockIn)) === todayIso && t.status === 'offen').length;
  const todaysEntries = [...state.timeEntries]
    .filter((t) => isoDate(new Date(t.clockIn)) === todayIso)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  return (
    <>
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <KpiCard
          icon="users2"
          label="Aktive Mitarbeiter"
          value={activeEmp}
          bg="var(--primary-tint)"
          fg="var(--primary-dark)"
          delta={`${state.employees.length} insgesamt`}
        />
        <KpiCard
          icon="bolt"
          label="Aktuell im Einsatz"
          value={activeNow.length}
          bg="#E3F3FE"
          fg="var(--accent-dark)"
          delta={activeNow.length ? 'Live eingestempelt' : 'Niemand aktiv'}
        />
        <KpiCard
          icon="hourglass"
          label="Stunden diese Woche"
          value={`${hoursWeek.toFixed(1)} h`}
          bg="var(--amber-tint)"
          fg="#93670A"
          delta={`Soll: ${state.settings.weeklyHours} h/Woche`}
        />
        <KpiCard
          icon="absence"
          label="Offene Anträge"
          value={openAbsences}
          bg="var(--red-tint)"
          fg="var(--red)"
          delta={openAbsences ? 'Prüfung erforderlich' : 'Alles bearbeitet'}
        />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>Zeiterfassung im Überblick</h3>
          <button className="muted-link" onClick={() => actions.setView('clock')}>
            Zeiterfassung verwalten →
          </button>
        </div>
        <div className="grid cols-3">
          <KpiCard
            icon="clock"
            label="Offen"
            value={teCounts.offen}
            bg="var(--amber-tint)"
            fg="#93670A"
            delta="zur Prüfung"
            onClick={() => {
              actions.setFilter({ teStatus: 'offen' });
              actions.setView('clock');
            }}
          />
          <KpiCard
            icon="check"
            label="Bestätigt"
            value={teCounts['bestätigt']}
            bg="var(--primary-tint)"
            fg="var(--primary-dark)"
            delta="abgeschlossen"
            onClick={() => {
              actions.setFilter({ teStatus: 'bestätigt' });
              actions.setView('clock');
            }}
          />
          <KpiCard
            icon="edit"
            label="Korrigiert"
            value={teCounts.korrigiert}
            bg="#E3EDF7"
            fg="#2A6FA8"
            delta="nachträglich angepasst"
            onClick={() => {
              actions.setFilter({ teStatus: 'korrigiert' });
              actions.setView('clock');
            }}
          />
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-head">
            <h3>Ein-/Ausstempeln</h3>
            <button className="muted-link" onClick={() => actions.setView('clock')}>
              Zur Zeiterfassung →
            </button>
          </div>
          <StampWidget compact />
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Live-Status</h3>
          </div>
          <div className="stamp-meta" style={{ marginTop: 0, marginBottom: 14 }}>
            <div>
              Eingestempelt
              <b>{activeNow.length}</b>
            </div>
            <div>
              In Pause
              <b>{onPauseCount}</b>
            </div>
            <div>
              Offene Einträge heute
              <b>{openTodayCount}</b>
            </div>
          </div>
          {activeNow.length ? (
            activeNow.map((t) => {
              const e = getEmp(state, t.employeeId);
              const c = getCust(state, t.customerId);
              if (!e) return null;
              const onPause = !!t.pauseStart;
              return (
                <div key={t.id} className="me-shift-row" onClick={() => actions.openLiveStatusPanel(t.id)}>
                  <div className="person" style={{ flex: 1 }}>
                    <div className="avatar" style={{ background: colorFor(e.id) }}>
                      {initials(e.name)}
                    </div>
                    <div>
                      <div className="name">{e.name}</div>
                      <div className="meta">
                        {c ? c.name : '–'} · seit {fmtTime(new Date(t.clockIn))}
                      </div>
                      <div className="meta">{c ? c.address : '–'}</div>
                    </div>
                  </div>
                  {onPause ? (
                    <span className="badge badge-amber">
                      <span className="badge-dot" />
                      Pause seit {fmtTime(new Date(t.pauseStart as string))}
                    </span>
                  ) : (
                    <span className="badge badge-mint">
                      <span className="badge-dot" />
                      Arbeitet
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <Empty icon="bolt" text="Aktuell ist niemand eingestempelt." />
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>Heutige Zeiterfassungen</h3>
          <button className="muted-link" onClick={() => actions.setView('clock')}>
            Alle Zeiterfassungen →
          </button>
        </div>
        {todaysEntries.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mitarbeiter</th>
                  <th>Objekt</th>
                  <th>Startzeit</th>
                  <th>Endzeit</th>
                  <th>Pause</th>
                  <th>Gesamtzeit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todaysEntries.map((t) => {
                  const e = getEmp(state, t.employeeId);
                  const c = getCust(state, t.customerId);
                  if (!e) return null;
                  const inD = new Date(t.clockIn);
                  const outD = t.clockOut ? new Date(t.clockOut) : null;
                  const dur = outD ? (outD.getTime() - inD.getTime()) / 60000 - (t.pauseMinutes || 0) : null;
                  return (
                    <tr key={t.id} onClick={() => actions.openTimeEntryPanel(t.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="person">
                          <div className="avatar" style={{ background: colorFor(e.id) }}>
                            {initials(e.name)}
                          </div>
                          <span>{e.name}</span>
                        </div>
                      </td>
                      <td>{c ? c.name : '–'}</td>
                      <td className="mono">{fmtTime(inD)}</td>
                      <td className="mono">
                        {outD ? fmtTime(outD) : <span style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>läuft…</span>}
                      </td>
                      <td className="mono">{t.pauseMinutes || 0} min</td>
                      <td className="mono">{dur !== null ? `${Math.round(dur)} min` : '–'}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="clock" text="Heute noch keine Zeiterfassungen." />
        )}
      </div>

      <div className="grid cols-2">
        <div className="card">
          <div className="card-head">
            <h3>Heutige Schichten</h3>
            <button className="muted-link" onClick={() => actions.setView('schedule')}>
              Dienstplan →
            </button>
          </div>
          {todaysShifts.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Zeit</th>
                    <th>Mitarbeiter</th>
                    <th>Standort</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todaysShifts.map((s) => {
                    const e = getEmp(state, s.employeeId);
                    const c = getCust(state, s.customerId);
                    return (
                      <tr key={s.id} onClick={() => actions.openShiftPanel(s.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono">
                          {s.start}–{s.end}
                        </td>
                        <td>
                          {e ? (
                            <div className="person">
                              <div className="avatar" style={{ background: colorFor(e.id) }}>
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
                          <StatusBadge status={shiftDisplayStatus(s, conflictIds)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="schedule" text="Keine Schichten für heute geplant." />
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Anstehende Abwesenheiten</h3>
            <button className="muted-link" onClick={() => actions.setView('absence')}>
              Alle ansehen →
            </button>
          </div>
          {upcomingAbsences.length ? (
            upcomingAbsences.map((a) => {
              const e = getEmp(state, a.employeeId);
              if (!e) return null;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div className="avatar" style={{ background: colorFor(e.id) }}>
                    {initials(e.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="name" style={{ fontWeight: 600 }}>
                      {e.name}
                    </div>
                    <div className="meta" style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>
                      {a.type} · {fmtDate(new Date(a.start))} – {fmtDate(new Date(a.end))}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              );
            })
          ) : (
            <Empty icon="absence" text="Keine anstehenden Abwesenheiten." />
          )}
        </div>
      </div>
    </>
  );
}
