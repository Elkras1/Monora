import React, { useState } from 'react';
import { useApp, useCurrentUser, useHasPerm } from '../state/AppContext';
import { computeConflictIds, getCust, getEmp, shiftDisplayStatus } from '../state/selectors';
import { getChatListFor } from '../state/chat';
import { KpiCard } from '../components/ui/KpiCard';
import { MaterialStatusBadge, StatusBadge, TicketPriorityBadge, TicketStatusBadge, ticketStatusColor } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { StampWidget } from '../components/StampWidget';
import { DashboardSettingsModal } from '../components/DashboardSettingsModal';
import { LiveStatusListModal } from '../components/LiveStatusListModal';
import { DASHBOARD_MODULES } from '../state/dashboardModules';
import { useDashboardPrefs } from '../hooks/useDashboardPrefs';
import { colorFor, initials, summarizeMaterialItems } from '../utils/format';
import { addDays, fmtDate, fmtTime, isoDate, mondayOf } from '../utils/date';
import type { TicketStatus, TimeEntry, TimeEntryStatus } from '../types';

const TICKET_STATUS_ORDER: TicketStatus[] = ['neu', 'geplant', 'in_bearbeitung', 'wartet_rueckmeldung', 'erledigt', 'abgeschlossen'];
const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  neu: 'Neu',
  geplant: 'Geplant',
  in_bearbeitung: 'In Bearbeitung',
  wartet_rueckmeldung: 'Wartet auf Rückmeldung',
  erledigt: 'Erledigt',
  abgeschlossen: 'Abgeschlossen',
};

export function DashboardPage() {
  const { state, actions } = useApp();
  const user = useCurrentUser();
  const hasPerm = useHasPerm();
  const canManageMaterial = hasPerm('material_manage');
  const { prefs, save: savePrefs, reset: resetPrefs } = useDashboardPrefs(user?.id ?? null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [liveListOpen, setLiveListOpen] = useState<'active' | 'pause' | null>(null);

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

  const absentToday = state.absences.filter((a) => a.status === 'genehmigt' && a.start <= todayIso && a.end >= todayIso);

  const geofenceIssues = [...state.timeEntries]
    .filter((t) => !t.geofenceOk && (!t.clockOut || isoDate(new Date(t.clockIn)) === todayIso))
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const newMaterialCount = state.materialRequests.filter((m) => m.status === 'eingereicht').length;
  const newestMaterialRequests = [...state.materialRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const urgentTickets = state.tickets
    .filter((t) => t.priority === 'dringend' && t.status !== 'erledigt' && t.status !== 'abgeschlossen')
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const overdueTickets = state.tickets.filter(
    (t) => t.dueDate && t.dueDate < todayIso && t.status !== 'erledigt' && t.status !== 'abgeschlossen'
  );
  const dueTodayTickets = state.tickets.filter((t) => t.dueDate === todayIso);
  const ticketStatusCounts: Record<TicketStatus, number> = {
    neu: 0,
    geplant: 0,
    in_bearbeitung: 0,
    wartet_rueckmeldung: 0,
    erledigt: 0,
    abgeschlossen: 0,
  };
  state.tickets.forEach((t) => {
    ticketStatusCounts[t.status]++;
  });
  const unreadChats = user ? getChatListFor(state, user.id).filter((c) => c.unreadCount > 0) : [];

  const openTimeEntry = (t: TimeEntry) => (t.clockOut ? actions.openTimeEntryPanel(t.id) : actions.openLiveStatusPanel(t.id));

  const moduleAllowed = (id: string) => {
    const def = DASHBOARD_MODULES.find((m) => m.id === id);
    return !!def && (!def.perm || hasPerm(def.perm));
  };
  const visibleMain = prefs.main.filter(moduleAllowed);
  const visibleMore = prefs.more.filter(moduleAllowed);

  const hideModule = (id: string) => {
    savePrefs({ main: prefs.main.filter((x) => x !== id), more: prefs.more.filter((x) => x !== id) });
  };
  const onModDrop = (e: React.DragEvent, zone: 'main' | 'more', targetId: string | null) => {
    e.preventDefault();
    if (!editMode || !dragId) return;
    const newMain = prefs.main.filter((x) => x !== dragId);
    const newMore = prefs.more.filter((x) => x !== dragId);
    const list = zone === 'main' ? newMain : newMore;
    const idx = targetId ? list.indexOf(targetId) : -1;
    list.splice(idx === -1 ? list.length : idx, 0, dragId);
    savePrefs({ main: newMain, more: newMore });
    setDragId(null);
  };

  function renderModule(id: string): React.ReactNode {
    switch (id) {
      case 'kpi-active-now':
        return (
          <KpiCard
            icon="bolt"
            label="Aktuell im Einsatz"
            value={activeNow.length}
            bg="#E3F3FE"
            fg="var(--accent-dark)"
            delta={activeNow.length ? 'Live eingestempelt' : 'Niemand aktiv'}
            onClick={() => setLiveListOpen('active')}
          />
        );
      case 'kpi-pause':
        return (
          <KpiCard
            icon="pause"
            label="In Pause"
            value={onPauseCount}
            bg="var(--amber-tint)"
            fg="#93670A"
            delta={onPauseCount ? 'Pausiert aktuell' : 'Niemand pausiert'}
            onClick={() => setLiveListOpen('pause')}
          />
        );
      case 'kpi-open-entries':
        return (
          <KpiCard
            icon="clock"
            label="Offene Zeiteinträge"
            value={teCounts.offen}
            bg="#E3EDF7"
            fg="#2A6FA8"
            delta={teCounts.offen ? 'zur Prüfung' : 'Alles bearbeitet'}
            onClick={() => {
              actions.setFilter({ teStatus: 'offen' });
              actions.setView('clock');
            }}
          />
        );
      case 'kpi-active-emp':
        return (
          <KpiCard
            icon="users2"
            label="Aktive Mitarbeiter"
            value={activeEmp}
            bg="var(--primary-tint)"
            fg="var(--primary-dark)"
            delta={`${state.employees.length} insgesamt`}
            onClick={() => actions.setView('employees')}
          />
        );
      case 'kpi-absences-today':
        return (
          <KpiCard
            icon="absence"
            label="Abwesenheiten heute"
            value={absentToday.length}
            bg="var(--red-tint)"
            fg="var(--red)"
            delta={absentToday.length ? 'aktuell abwesend' : 'Alle anwesend'}
            onClick={() => actions.setView('absence')}
          />
        );
      case 'kpi-geofence':
        return (
          <KpiCard
            icon="alert"
            label="Geofencing-Hinweise"
            value={geofenceIssues.length}
            bg="var(--amber-tint)"
            fg="var(--amber)"
            delta={geofenceIssues.length ? 'Standortabweichung' : 'Keine Auffälligkeiten'}
            onClick={() => actions.setView('clock')}
          />
        );
      case 'kpi-hours-week':
        return (
          <KpiCard
            icon="hourglass"
            label="Stunden diese Woche"
            value={`${hoursWeek.toFixed(1)} h`}
            bg="var(--amber-tint)"
            fg="#93670A"
            delta={`Soll: ${state.settings.weeklyHours} h/Woche`}
            onClick={() => actions.setView('clock')}
          />
        );
      case 'reports':
        return (
          <KpiCard
            icon="briefcase"
            label="Berichte"
            value="→"
            bg="var(--surface-alt)"
            fg="var(--ink-soft)"
            delta="Arbeitszeiten auswerten"
            onClick={() => actions.setView('reports')}
          />
        );
      case 'exports':
        return (
          <KpiCard
            icon="download"
            label="Exporte"
            value="→"
            bg="var(--surface-alt)"
            fg="var(--ink-soft)"
            delta="CSV / PDF exportieren"
            onClick={() => {
              actions.setFilter({ clockTab: 'eval' });
              actions.setView('clock');
            }}
          />
        );
      case 'mat-new':
        return (
          <>
            <div className="card-head">
              <h3>
                Neue Materialanfragen
                {newMaterialCount > 0 ? (
                  <span className="badge badge-amber" style={{ marginLeft: 8 }}>
                    {newMaterialCount}
                  </span>
                ) : null}
              </h3>
              <button className="muted-link" onClick={() => actions.setView('tickets-material')}>
                Alle anzeigen →
              </button>
            </div>
            {newestMaterialRequests.length ? (
              newestMaterialRequests.map((m) => {
                const cust = getCust(state, m.locationId);
                return (
                  <div key={m.id} className="dash-mat-row">
                    <div className="dash-mat-info" onClick={() => actions.openMaterialRequestPanel(m.id)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="name">{cust ? cust.name : 'Kein Objekt'}</div>
                        <div className="meta">
                          {m.items.length} Artikel · {summarizeMaterialItems(m.items, state.materials, 50)}
                        </div>
                      </div>
                    </div>
                    <div className="dash-mat-badges">
                      <MaterialStatusBadge status={m.status} />
                    </div>
                    <div className="dash-mat-actions">
                      <button className="icon-btn" title="Öffnen" onClick={() => actions.openMaterialRequestPanel(m.id)}>
                        <Icon name="eye" />
                      </button>
                      {canManageMaterial && m.status !== 'erledigt' && m.status !== 'abgelehnt' ? (
                        <button
                          className="btn btn-accent btn-sm"
                          onClick={() => {
                            if (window.confirm('Bestellung wirklich als erledigt markieren?')) actions.completeMaterialRequest(m.id);
                          }}
                        >
                          <Icon name="check" /> Erledigt
                        </button>
                      ) : null}
                      {canManageMaterial && !m.linkedTicketId ? (
                        <button className="icon-btn" title="Als Ticket übernehmen" onClick={() => actions.convertMaterialRequestToTicket(m.id, {})}>
                          <Icon name="ticket" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty icon="box" text="Keine Materialanfragen vorhanden." />
            )}
          </>
        );
      case 'tick-urgent':
        return (
          <>
            <div className="card-head">
              <h3>
                Dringende Tickets
                {urgentTickets.length > 0 ? (
                  <span className="badge badge-red" style={{ marginLeft: 8 }}>
                    {urgentTickets.length}
                  </span>
                ) : null}
              </h3>
              <button
                className="muted-link"
                onClick={() => {
                  actions.setFilter({ tickPriority: 'dringend', tickOverdueOnly: false });
                  actions.setView('tickets');
                }}
              >
                Alle anzeigen →
              </button>
            </div>
            {urgentTickets.length ? (
              urgentTickets.slice(0, 5).map((t) => {
                const cust = getCust(state, t.customerId);
                const emp = getEmp(state, t.assignedEmployeeId);
                const overdue = !!t.dueDate && t.dueDate < todayIso;
                return (
                  <div key={t.id} className="dash-tick-row">
                    <div className="dash-tick-info" onClick={() => actions.openTicketPanel(t.id)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="name">
                          {t.ticketNumber} · {t.title}
                        </div>
                        <div className="meta">
                          {cust ? cust.name : 'Kein Objekt'} · {emp ? emp.name : 'Nicht zugewiesen'}
                        </div>
                        <div className={`meta ${overdue ? 'dash-row-overdue' : ''}`}>
                          {t.dueDate ? `Fällig ${fmtDate(new Date(t.dueDate))}${overdue ? ' · überfällig' : ''}` : 'Kein Termin'}
                        </div>
                      </div>
                    </div>
                    <div className="dash-tick-badges">
                      <TicketPriorityBadge priority={t.priority} />
                      <TicketStatusBadge status={t.status} />
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty icon="ticket" text="Keine dringenden Tickets." />
            )}
          </>
        );
      case 'tick-overdue':
        return (
          <>
            <div className="card-head">
              <h3>
                Überfällige Tickets
                {overdueTickets.length > 0 ? (
                  <span className="badge badge-red" style={{ marginLeft: 8, background: 'var(--red-dark)', color: '#fff' }}>
                    {overdueTickets.length}
                  </span>
                ) : null}
              </h3>
              <button
                className="muted-link"
                onClick={() => {
                  actions.setFilter({ tickOverdueOnly: true, tickPriority: '' });
                  actions.setView('tickets');
                }}
              >
                Alle anzeigen →
              </button>
            </div>
            {overdueTickets.length ? (
              overdueTickets.slice(0, 5).map((t) => {
                const cust = getCust(state, t.customerId);
                const emp = getEmp(state, t.assignedEmployeeId);
                return (
                  <div key={t.id} className="dash-tick-row">
                    <div className="dash-tick-info" onClick={() => actions.openTicketPanel(t.id)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="name">
                          {t.ticketNumber} · {t.title}
                        </div>
                        <div className="meta">
                          {cust ? cust.name : 'Kein Objekt'} · {emp ? emp.name : 'Nicht zugewiesen'}
                        </div>
                        <div className="meta dash-row-overdue">{t.dueDate ? `Fällig ${fmtDate(new Date(t.dueDate))} · überfällig` : ''}</div>
                      </div>
                    </div>
                    <div className="dash-tick-badges">
                      <TicketPriorityBadge priority={t.priority} />
                      <TicketStatusBadge status={t.status} />
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty icon="ticket" text="Keine überfälligen Tickets." />
            )}
          </>
        );
      case 'today-entries':
        return (
          <>
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
          </>
        );
      case 'ticket-calendar-today':
        return (
          <>
            <div className="card-head">
              <h3>Ticket-Kalender heute</h3>
              <button className="muted-link" onClick={() => actions.setView('tickets-calendar')}>
                Zum Kalender →
              </button>
            </div>
            {dueTodayTickets.length ? (
              dueTodayTickets.map((t) => {
                const cust = getCust(state, t.customerId);
                return (
                  <div key={t.id} className="dash-tick-row">
                    <div className="dash-tick-info" onClick={() => actions.openTicketPanel(t.id)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="name">
                          {t.dueTime ? `${t.dueTime} · ` : ''}
                          {t.title}
                        </div>
                        <div className="meta">{cust ? cust.name : 'Kein Objekt'}</div>
                      </div>
                    </div>
                    <TicketStatusBadge status={t.status} />
                  </div>
                );
              })
            ) : (
              <Empty icon="schedule" text="Heute sind keine Tickets fällig." />
            )}
          </>
        );
      case 'ticket-status-overview':
        return (
          <>
            <div className="card-head">
              <h3>Ticket-Statusübersicht</h3>
              <button className="muted-link" onClick={() => actions.setView('tickets')}>
                Alle Tickets →
              </button>
            </div>
            {TICKET_STATUS_ORDER.map((s) => (
              <div
                key={s}
                className="dash-status-row"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  actions.setFilter({ tickStatus: s });
                  actions.setView('tickets');
                }}
              >
                <span className="lbl">
                  <i style={{ background: ticketStatusColor(s) }} />
                  {TICKET_STATUS_LABEL[s]}
                </span>
                <span className="val">{ticketStatusCounts[s]}</span>
              </div>
            ))}
          </>
        );
      case 'chat-new':
        return (
          <>
            <div className="card-head">
              <h3>
                Neue Chat-Nachrichten
                {unreadChats.length > 0 ? (
                  <span className="badge badge-blue" style={{ marginLeft: 8 }}>
                    {unreadChats.reduce((sum, c) => sum + c.unreadCount, 0)}
                  </span>
                ) : null}
              </h3>
              <button className="muted-link" onClick={() => actions.setView('messages')}>
                Zum Chat →
              </button>
            </div>
            {unreadChats.length ? (
              unreadChats.map((c) => (
                <div key={c.chatId} className="dash-tick-row" onClick={() => actions.setView('messages')} style={{ cursor: 'pointer' }}>
                  <div className="dash-tick-info">
                    <div className="avatar" style={{ background: colorFor(c.partner.id) }}>
                      {initials(c.partner.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="name">{c.partner.name}</div>
                      <div className="meta">{c.lastMessage?.text || ''}</div>
                    </div>
                  </div>
                  <span className="chat-unread-badge">{c.unreadCount}</span>
                </div>
              ))
            ) : (
              <Empty icon="message" text="Keine neuen Nachrichten." />
            )}
          </>
        );
      case 'stamp-live':
        return (
          <div className="grid cols-2" style={{ alignItems: 'start' }}>
            <div>
              <div className="card-head">
                <h3>Ein-/Ausstempeln</h3>
                <button className="muted-link" onClick={() => actions.setView('clock')}>
                  Zur Zeiterfassung →
                </button>
              </div>
              <StampWidget compact />
            </div>
            <div>
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
                        </div>
                      </div>
                      {onPause ? (
                        <span className="badge badge-amber">
                          <span className="badge-dot" />
                          Pause
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
        );
      case 'today-shifts':
        return (
          <>
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
          </>
        );
      case 'upcoming-absences':
        return (
          <>
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
          </>
        );
      case 'te-overview':
        return (
          <>
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
          </>
        );
      default:
        return null;
    }
  }

  const ModuleGroup = ({ ids, zone }: { ids: string[]; zone: 'main' | 'more' }) => (
    <div
      className="dash-modules"
      onDragOver={(e) => editMode && e.preventDefault()}
      onDrop={(e) => onModDrop(e, zone, null)}
    >
      {ids.map((id) => {
        const def = DASHBOARD_MODULES.find((m) => m.id === id);
        return (
          <div
            key={id}
            className={`dash-module size-${def?.size ?? 'lg'} ${editMode ? 'is-editable' : ''}`}
            draggable={editMode}
            onDragStart={(e) => {
              if (!editMode) return;
              e.dataTransfer.setData('text/plain', id);
              setDragId(id);
            }}
            onDragOver={(e) => editMode && e.preventDefault()}
            onDrop={(e) => {
              e.stopPropagation();
              onModDrop(e, zone, id);
            }}
          >
            {editMode ? (
              <div className="dash-module-edit-head">
                <Icon name="menu" />
                <span>{def?.label ?? id}</span>
                <button className="icon-btn" title="Ausblenden" onClick={() => hideModule(id)}>
                  <Icon name="close" />
                </button>
              </div>
            ) : null}
            <div className={`card dash-module-body ${editMode ? 'is-locked' : ''}`}>{renderModule(id)}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="dash-header-row">
        <div />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-outline ${editMode ? 'is-active' : ''}`}
            onClick={() => {
              const next = !editMode;
              setEditMode(next);
              if (next) setMoreExpanded(true);
            }}
          >
            <Icon name={editMode ? 'check' : 'edit'} /> {editMode ? 'Fertig' : 'Dashboard bearbeiten'}
          </button>
          <button className="btn btn-outline" onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" /> Dashboard anpassen
          </button>
        </div>
      </div>

      {editMode ? (
        <div className="hint" style={{ marginBottom: 14 }}>
          Bearbeitungsmodus aktiv: Module per Drag &amp; Drop verschieben oder mit „×" ausblenden. Klicks auf Inhalte sind währenddessen deaktiviert.
        </div>
      ) : null}

      {visibleMain.length ? <ModuleGroup ids={visibleMain} zone="main" /> : <Empty icon="dashboard" text="Keine Module ausgewählt. Öffne „Dashboard anpassen“, um Bereiche einzublenden." />}

      <button className="dash-more-toggle" onClick={() => setMoreExpanded((v) => !v)} style={{ marginTop: 16 }}>
        <span>Weitere Informationen{visibleMore.length ? ` (${visibleMore.length})` : ''}</span>
        <Icon name={moreExpanded ? 'chevUp' : 'chevDown'} />
      </button>

      {moreExpanded || editMode ? (
        <>
          {visibleMore.length ? <ModuleGroup ids={visibleMore} zone="more" /> : null}
          {editMode ? (
            <div className="dash-drop-hint" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onModDrop(e, 'more', null)}>
              Module hierher ziehen, um sie unter „Weitere Informationen" abzulegen.
            </div>
          ) : !visibleMore.length ? (
            <div className="hint" style={{ padding: '10px 4px' }}>
              Noch keine weiteren Module ausgewählt.
            </div>
          ) : null}
        </>
      ) : null}

      {settingsOpen ? (
        <DashboardSettingsModal prefs={prefs} onSave={savePrefs} onReset={resetPrefs} onClose={() => setSettingsOpen(false)} />
      ) : null}

      {liveListOpen ? <LiveStatusListModal kind={liveListOpen} onClose={() => setLiveListOpen(null)} /> : null}
    </>
  );
}
