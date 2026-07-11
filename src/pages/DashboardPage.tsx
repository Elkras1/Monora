import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { computeConflictIds, getCust, getEmp, shiftDisplayStatus } from '../state/selectors';
import { KpiCard } from '../components/ui/KpiCard';
import { AbsenceTypeBadge, StatusBadge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { StampWidget } from '../components/StampWidget';
import { colorFor, initials } from '../utils/format';
import { addDays, fmtDate, fmtTime, isoDate, mondayOf } from '../utils/date';
import type { TimeEntry, TimeEntryStatus } from '../types';

type DetailKey = 'activeEmp' | 'activeNow' | 'pause' | 'openEntries' | 'absencesToday' | 'geofence';

export function DashboardPage() {
  const { state, actions } = useApp();
  const [detail, setDetail] = useState<DetailKey | null>(null);
  const toggleDetail = (key: DetailKey) => setDetail((d) => (d === key ? null : key));
  // Alles unterhalb der Live-Kennzahlen ist standardmässig sichtbar (keine Information geht verloren),
  // lässt sich aber einklappen, damit das Dashboard auf den ersten Blick weniger überladen wirkt.
  const [moreExpanded, setMoreExpanded] = useState(true);

  const activeNow = state.timeEntries.filter((t) => !t.clockOut);
  const activeEmployees = state.employees.filter((e) => e.status === 'aktiv');
  const activeEmp = activeEmployees.length;
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

  const pauseNow = activeNow.filter((t) => t.pauseStart);
  const onPauseCount = pauseNow.length;
  const openTodayCount = state.timeEntries.filter((t) => isoDate(new Date(t.clockIn)) === todayIso && t.status === 'offen').length;
  const todaysEntries = [...state.timeEntries]
    .filter((t) => isoDate(new Date(t.clockIn)) === todayIso)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const openEntries = [...state.timeEntries]
    .filter((t) => t.status === 'offen')
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const absentToday = state.absences.filter((a) => a.status === 'genehmigt' && a.start <= todayIso && a.end >= todayIso);

  const geofenceIssues = [...state.timeEntries]
    .filter((t) => !t.geofenceOk && (!t.clockOut || isoDate(new Date(t.clockIn)) === todayIso))
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const openTimeEntry = (t: TimeEntry) => (t.clockOut ? actions.openTimeEntryPanel(t.id) : actions.openLiveStatusPanel(t.id));

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
          active={detail === 'activeEmp'}
          onClick={() => toggleDetail('activeEmp')}
        />
        <KpiCard
          icon="bolt"
          label="Aktuell im Einsatz"
          value={activeNow.length}
          bg="#E3F3FE"
          fg="var(--accent-dark)"
          delta={activeNow.length ? 'Live eingestempelt' : 'Niemand aktiv'}
          active={detail === 'activeNow'}
          onClick={() => toggleDetail('activeNow')}
        />
        <KpiCard
          icon="pause"
          label="In Pause"
          value={onPauseCount}
          bg="var(--amber-tint)"
          fg="#93670A"
          delta={onPauseCount ? 'Pausiert aktuell' : 'Niemand pausiert'}
          active={detail === 'pause'}
          onClick={() => toggleDetail('pause')}
        />
        <KpiCard
          icon="clock"
          label="Offene Zeiteinträge"
          value={teCounts.offen}
          bg="#E3EDF7"
          fg="#2A6FA8"
          delta={teCounts.offen ? 'zur Prüfung' : 'Alles bearbeitet'}
          active={detail === 'openEntries'}
          onClick={() => toggleDetail('openEntries')}
        />
        <KpiCard
          icon="absence"
          label="Abwesenheiten heute"
          value={absentToday.length}
          bg="var(--red-tint)"
          fg="var(--red)"
          delta={absentToday.length ? 'aktuell abwesend' : 'Alle anwesend'}
          active={detail === 'absencesToday'}
          onClick={() => toggleDetail('absencesToday')}
        />
        <KpiCard
          icon="alert"
          label="Geofencing-Hinweise"
          value={geofenceIssues.length}
          bg="var(--amber-tint)"
          fg="var(--amber)"
          delta={geofenceIssues.length ? 'Standortabweichung' : 'Keine Auffälligkeiten'}
          active={detail === 'geofence'}
          onClick={() => toggleDetail('geofence')}
        />
        <KpiCard
          icon="hourglass"
          label="Stunden diese Woche"
          value={`${hoursWeek.toFixed(1)} h`}
          bg="var(--amber-tint)"
          fg="#93670A"
          delta={`Soll: ${state.settings.weeklyHours} h/Woche`}
        />
      </div>

      {detail ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h3>
              {detail === 'activeEmp' && 'Aktive Mitarbeiter'}
              {detail === 'activeNow' && 'Aktuell im Einsatz'}
              {detail === 'pause' && 'In Pause'}
              {detail === 'openEntries' && 'Offene Zeiteinträge'}
              {detail === 'absencesToday' && 'Abwesenheiten heute'}
              {detail === 'geofence' && 'Geofencing-Hinweise'}
            </h3>
            <button className="icon-btn" onClick={() => setDetail(null)}>
              <Icon name="close" />
            </button>
          </div>

          {detail === 'activeEmp' &&
            (activeEmployees.length ? (
              activeEmployees.map((e) => {
                const live = activeNow.find((t) => t.employeeId === e.id);
                return (
                  <div key={e.id} className="dash-detail-row">
                    <div className="avatar" style={{ background: colorFor(e.id) }}>
                      {initials(e.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="name" style={{ fontWeight: 600 }}>
                        {e.name}
                      </div>
                      <div className="meta" style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>
                        {e.role}
                      </div>
                    </div>
                    {live ? (
                      <span className={`badge ${live.pauseStart ? 'badge-amber' : 'badge-mint'}`}>
                        <span className="badge-dot" />
                        {live.pauseStart ? 'In Pause' : 'Im Einsatz'}
                      </span>
                    ) : (
                      <span className="hint">Nicht eingestempelt</span>
                    )}
                  </div>
                );
              })
            ) : (
              <Empty icon="users2" text="Keine aktiven Mitarbeiter." />
            ))}

          {detail === 'activeNow' &&
            (activeNow.length ? (
              activeNow.map((t) => {
                const e = getEmp(state, t.employeeId);
                const c = getCust(state, t.customerId);
                if (!e) return null;
                return (
                  <div key={t.id} className="me-shift-row" onClick={() => actions.openLiveStatusPanel(t.id)}>
                    <div className="person" style={{ flex: 1 }}>
                      <div className="avatar" style={{ background: colorFor(e.id) }}>
                        {initials(e.name)}
                      </div>
                      <div>
                        <div className="name">{e.name}</div>
                        <div className="meta">{c ? c.name : '–'}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 700 }}>
                        seit {fmtTime(new Date(t.clockIn))}
                      </div>
                      <div className="hint">{durationSince(t.clockIn)}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty icon="bolt" text="Aktuell ist niemand eingestempelt." />
            ))}

          {detail === 'pause' &&
            (pauseNow.length ? (
              pauseNow.map((t) => {
                const e = getEmp(state, t.employeeId);
                const c = getCust(state, t.customerId);
                if (!e) return null;
                return (
                  <div key={t.id} className="me-shift-row" onClick={() => actions.openLiveStatusPanel(t.id)}>
                    <div className="person" style={{ flex: 1 }}>
                      <div className="avatar" style={{ background: colorFor(e.id) }}>
                        {initials(e.name)}
                      </div>
                      <div>
                        <div className="name">{e.name}</div>
                        <div className="meta">{c ? c.name : '–'}</div>
                      </div>
                    </div>
                    <span className="badge badge-amber">
                      <span className="badge-dot" />
                      Pause seit {fmtTime(new Date(t.pauseStart as string))}
                    </span>
                  </div>
                );
              })
            ) : (
              <Empty icon="pause" text="Aktuell macht niemand Pause." />
            ))}

          {detail === 'openEntries' &&
            (openEntries.length ? (
              openEntries.map((t) => {
                const e = getEmp(state, t.employeeId);
                const c = getCust(state, t.customerId);
                if (!e) return null;
                return (
                  <div key={t.id} className="me-shift-row" onClick={() => openTimeEntry(t)}>
                    <div className="person" style={{ flex: 1 }}>
                      <div className="avatar" style={{ background: colorFor(e.id) }}>
                        {initials(e.name)}
                      </div>
                      <div>
                        <div className="name">{e.name}</div>
                        <div className="meta">
                          {c ? c.name : '–'} · {fmtDate(new Date(t.clockIn))}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                );
              })
            ) : (
              <Empty icon="clock" text="Keine offenen Zeiteinträge." />
            ))}

          {detail === 'absencesToday' &&
            (absentToday.length ? (
              absentToday.map((a) => {
                const e = getEmp(state, a.employeeId);
                if (!e) return null;
                return (
                  <div key={a.id} className="dash-detail-row">
                    <div className="avatar" style={{ background: colorFor(e.id) }}>
                      {initials(e.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="name" style={{ fontWeight: 600 }}>
                        {e.name}
                      </div>
                      <div className="meta" style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>
                        {fmtDate(new Date(a.start))} – {fmtDate(new Date(a.end))}
                      </div>
                    </div>
                    <AbsenceTypeBadge type={a.type} />
                  </div>
                );
              })
            ) : (
              <Empty icon="absence" text="Heute ist niemand abwesend." />
            ))}

          {detail === 'geofence' &&
            (geofenceIssues.length ? (
              geofenceIssues.map((t) => {
                const e = getEmp(state, t.employeeId);
                const c = getCust(state, t.customerId);
                if (!e) return null;
                return (
                  <div key={t.id} className="me-shift-row" onClick={() => openTimeEntry(t)}>
                    <div className="person" style={{ flex: 1 }}>
                      <div className="avatar" style={{ background: colorFor(e.id) }}>
                        {initials(e.name)}
                      </div>
                      <div>
                        <div className="name">{e.name}</div>
                        <div className="meta">
                          {c ? c.name : '–'} · {fmtTime(new Date(t.clockIn))} · {Math.round(t.checkInDistance)} m Abweichung
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-amber">
                      <span className="badge-dot" />
                      Abweichung
                    </span>
                  </div>
                );
              })
            ) : (
              <Empty icon="alert" text="Keine Geofencing-Auffälligkeiten." />
            ))}
        </div>
      ) : null}

      <button className="dash-more-toggle" onClick={() => setMoreExpanded((v) => !v)}>
        <span>Weitere Details</span>
        <Icon name={moreExpanded ? 'chevUp' : 'chevDown'} />
      </button>

      {moreExpanded ? (
        <>
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
      ) : null}
    </>
  );
}

function durationSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`;
}
