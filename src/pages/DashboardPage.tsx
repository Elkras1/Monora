import React, { useState } from 'react';
import { useApp, useCurrentUser, useHasPerm } from '../state/AppContext';
import {
  computeConflictIds,
  dueLabel,
  dueRank,
  getAbsencePercentage,
  getCust,
  getEmp,
  materialUrgency,
  shiftDisplayStatus,
  ticketUrgency,
} from '../state/selectors';
import { getChatListFor } from '../state/chat';
import { KpiCard } from '../components/ui/KpiCard';
import { StatusBadge, dashboardUrgencyRowClass } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { StampWidget } from '../components/StampWidget';
import { DashboardCalendar } from '../components/DashboardCalendar';
import { DashboardWorkList, DASH_WORKLIST_MAX_ROWS } from '../components/DashboardWorkList';
import { DashboardSettingsModal } from '../components/DashboardSettingsModal';
import { LiveStatusListModal } from '../components/LiveStatusListModal';
import { DASHBOARD_MODULES } from '../state/dashboardModules';
import { useDashboardPrefs } from '../hooks/useDashboardPrefs';
import { colorFor, initials, materialItemName } from '../utils/format';
import { addDays, fmtDate, fmtTime, isoDate, mondayOf } from '../utils/date';
import type { TimeEntry, TimeEntryStatus } from '../types';

/**
 * Bewusst AUSSERHALB von DashboardPage definiert (Modul-Ebene statt lokale Funktion im Funktionsrumpf):
 * Eine Komponente, die bei jedem Render der Elternkomponente neu als Funktion erzeugt wird, hat für React
 * jedes Mal einen neuen "type" — React räumt den kompletten DOM-Teilbaum ab und baut ihn neu auf, statt nur
 * die Props zu aktualisieren. Genau das passierte hier bisher: `setDragId(...)` in onDragStart löste einen
 * Re-Render von DashboardPage aus, wodurch die lokal definierte ModuleGroup-Funktion neu erzeugt und der
 * gerade gezogene DOM-Knoten mitten im nativen HTML5-Drag entfernt/neu gemountet wurde — das bricht die
 * laufende Drag-Geste ab bzw. macht das Drop-Ziel/-Ergebnis unzuverlässig. Mit stabiler Komponentenidentität
 * hier oben aktualisiert React beim Re-Render nur noch die Props auf denselben DOM-Knoten, der Drag bleibt
 * intakt und der Drop wird zuverlässig committed.
 */
function ModuleGroup({
  ids,
  editMode,
  onDropZone,
  onDropModule,
  onDragStartModule,
  hideModule,
  renderModule,
}: {
  ids: string[];
  editMode: boolean;
  onDropZone: (e: React.DragEvent) => void;
  onDropModule: (e: React.DragEvent, id: string) => void;
  onDragStartModule: (e: React.DragEvent, id: string) => void;
  hideModule: (id: string) => void;
  renderModule: (id: string) => React.ReactNode;
}) {
  const renderOne = (id: string) => {
    const def = DASHBOARD_MODULES.find((m) => m.id === id);
    return (
      <div
        key={id}
        className={`dash-module size-${def?.size ?? 'lg'} ${editMode ? 'is-editable' : ''}`}
        draggable={editMode}
        onDragStart={(e) => onDragStartModule(e, id)}
        onDragOver={(e) => editMode && e.preventDefault()}
        onDrop={(e) => {
          e.stopPropagation();
          onDropModule(e, id);
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
  };

  // Tickets und Materialanfragen sind die beiden zentralen, gleichwertigen Arbeitslisten des Dashboards und
  // werden bewusst als FESTES Paar in einer eigenen Zeile gerendert (siehe .dash-module-pair-row in
  // global.css), statt sich wie alle anderen Module frei in den Flex-Umbruch einzureihen — nur so ist die
  // exakte 50/50-Aufteilung unabhängig von Position/Grösse benachbarter Module garantiert. Sind (z.B. wegen
  // fehlender Berechtigung oder weil der Benutzer eines der beiden in "Weitere Informationen" verschoben hat)
  // nicht beide in derselben Gruppe sichtbar, fällt die Anzeige auf die normale Einzel-Modul-Darstellung zurück.
  const seen = new Set<string>();
  const blocks: React.ReactNode[] = [];
  ids.forEach((id) => {
    if (seen.has(id)) return;
    const pairId = id === 'kpi-tickets' ? 'kpi-materials' : id === 'kpi-materials' ? 'kpi-tickets' : null;
    if (pairId && ids.includes(pairId)) {
      seen.add('kpi-tickets');
      seen.add('kpi-materials');
      blocks.push(
        <div className="dash-module-pair-row" key="pair-tickets-materials">
          {renderOne('kpi-tickets')}
          {renderOne('kpi-materials')}
        </div>
      );
      return;
    }
    seen.add(id);
    blocks.push(renderOne(id));
  });

  return (
    <div className="dash-modules" onDragOver={(e) => editMode && e.preventDefault()} onDrop={onDropZone}>
      {blocks}
    </div>
  );
}

export function DashboardPage() {
  const { state, actions } = useApp();
  const user = useCurrentUser();
  const hasPerm = useHasPerm();
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

  const canEditTickets = hasPerm('tickets_edit');
  const canCreateTickets = hasPerm('tickets_create');
  const canManageMaterial = hasPerm('material_manage');

  const tomorrowIso = isoDate(addDays(new Date(), 1));

  // Tickets und Materialanfragen sind zwei parallele Arbeitslisten im Dashboard (siehe DashboardWorkList) —
  // dieselbe Prioritäts-Sortierung (überfällig < heute < morgen < später < ohne Fälligkeitsdatum, siehe
  // dueRank in state/selectors.ts) und derselbe Zeilen-Deckel (DASH_WORKLIST_MAX_ROWS) für beide, damit sie
  // sich identisch verhalten. type !== 'material' ist hier bewusst: Tickets, die aus einer Materialanfrage
  // erzeugt wurden (convertMaterialRequestToTicket, siehe MaterialRequestPanel), gehören technisch weiterhin
  // zu state.tickets, sollen aber NIE im Ticketbereich auftauchen — nur die Materialanfrage selbst zählt.
  const openTickets = [...state.tickets]
    .filter((t) => t.type !== 'material' && t.status !== 'erledigt')
    .sort((a, b) => dueRank(a.dueDate, todayIso, tomorrowIso) - dueRank(b.dueDate, todayIso, tomorrowIso) || (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))
    .slice(0, DASH_WORKLIST_MAX_ROWS);

  const openMaterialRequests = [...state.materialRequests]
    .filter((m) => m.status === 'offen')
    .sort(
      (a, b) =>
        dueRank(a.requestedDate, todayIso, tomorrowIso) - dueRank(b.requestedDate, todayIso, tomorrowIso) ||
        (a.requestedDate ?? '9999-99-99').localeCompare(b.requestedDate ?? '9999-99-99')
    )
    .slice(0, DASH_WORKLIST_MAX_ROWS);

  const unreadChats = user ? getChatListFor(state, user.id).filter((c) => c.unreadCount > 0) : [];

  const openTimeEntry = (t: TimeEntry) => (t.clockOut ? actions.openTimeEntryPanel(t.id) : actions.openLiveStatusPanel(t.id));

  const moduleAllowed = (id: string) => {
    const def = DASHBOARD_MODULES.find((m) => m.id === id);
    return !!def && (!def.perm || hasPerm(def.perm));
  };
  const visibleMain = prefs.main.filter(moduleAllowed);
  const visibleMore = prefs.more.filter(moduleAllowed);

  const hideModule = (id: string) => {
    savePrefs({
      main: prefs.main.filter((x) => x !== id),
      more: prefs.more.filter((x) => x !== id),
      hidden: prefs.hidden.includes(id) ? prefs.hidden : [...prefs.hidden, id],
    });
  };
  const onModDrop = (e: React.DragEvent, zone: 'main' | 'more', targetId: string | null) => {
    e.preventDefault();
    if (!editMode || !dragId) return;
    const newMain = prefs.main.filter((x) => x !== dragId);
    const newMore = prefs.more.filter((x) => x !== dragId);
    const list = zone === 'main' ? newMain : newMore;
    const idx = targetId ? list.indexOf(targetId) : -1;
    list.splice(idx === -1 ? list.length : idx, 0, dragId);
    savePrefs({ main: newMain, more: newMore, hidden: prefs.hidden });
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
      case 'kpi-materials':
        return (
          <DashboardWorkList
            title="Materialanfragen"
            onAdd={canManageMaterial ? () => actions.openModal('materialRequest') : undefined}
            addTooltip="Neue Materialanfrage"
            items={openMaterialRequests}
            getKey={(m) => m.id}
            rowClassName={(m) => dashboardUrgencyRowClass(materialUrgency(m, todayIso, tomorrowIso))}
            onRowClick={(m) => actions.openMaterialRequestPanel(m.id)}
            onComplete={canManageMaterial ? (m) => actions.completeMaterialRequest(m.id) : undefined}
            completeTooltip="Als erledigt markieren"
            renderName={(m) => getCust(state, m.locationId)?.name ?? 'Kein Objekt'}
            renderMeta={(m) => m.items.map((i) => `${materialItemName(i, state.materials)} × ${i.quantity}`).join(' · ')}
            renderDue={(m) => dueLabel(m.requestedDate, todayIso, tomorrowIso)}
            isOverdue={(m) => materialUrgency(m, todayIso, tomorrowIso) === 'overdue'}
            emptyIcon="box"
            emptyText="Keine offenen Materialanfragen."
          />
        );
      case 'kpi-tickets':
        return (
          <DashboardWorkList
            title="Tickets"
            onAdd={canCreateTickets ? () => actions.openModal('ticket') : undefined}
            addTooltip="Neues Ticket"
            items={openTickets}
            getKey={(t) => t.id}
            rowClassName={(t) => dashboardUrgencyRowClass(ticketUrgency(t, todayIso, tomorrowIso))}
            onRowClick={(t) => actions.openTicketPanel(t.id)}
            onComplete={canEditTickets ? (t) => actions.setTicketStatus(t.id, 'erledigt') : undefined}
            completeTooltip="Als erledigt markieren"
            renderName={(t) => t.title}
            renderMeta={(t) => getCust(state, t.customerId)?.name ?? 'Kein Objekt'}
            renderDue={(t) => dueLabel(t.dueDate, todayIso, tomorrowIso)}
            isOverdue={(t) => ticketUrgency(t, todayIso, tomorrowIso) === 'overdue'}
            emptyIcon="ticket"
            emptyText="Keine offenen Tickets."
          />
        );
      case 'dash-calendar':
        return <DashboardCalendar />;
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
                        {a.type}
                        {getAbsencePercentage(a) < 100 ? ` · ${getAbsencePercentage(a)}%` : ''} · {fmtDate(new Date(a.start))} –{' '}
                        {fmtDate(new Date(a.end))}
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

  const onDragStartModule = (e: React.DragEvent, id: string) => {
    if (!editMode) return;
    e.dataTransfer.setData('text/plain', id);
    setDragId(id);
  };

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

      {visibleMain.length ? (
        <ModuleGroup
          ids={visibleMain}
          editMode={editMode}
          onDropZone={(e) => onModDrop(e, 'main', null)}
          onDropModule={(e, id) => onModDrop(e, 'main', id)}
          onDragStartModule={onDragStartModule}
          hideModule={hideModule}
          renderModule={renderModule}
        />
      ) : (
        <Empty icon="dashboard" text="Keine Module ausgewählt. Öffne „Dashboard anpassen“, um Bereiche einzublenden." />
      )}

      <button className="dash-more-toggle" onClick={() => setMoreExpanded((v) => !v)} style={{ marginTop: 16 }}>
        <span>Weitere Informationen{visibleMore.length ? ` (${visibleMore.length})` : ''}</span>
        <Icon name={moreExpanded ? 'chevUp' : 'chevDown'} />
      </button>

      {moreExpanded || editMode ? (
        <>
          {visibleMore.length ? (
            <ModuleGroup
              ids={visibleMore}
              editMode={editMode}
              onDropZone={(e) => onModDrop(e, 'more', null)}
              onDropModule={(e, id) => onModDrop(e, 'more', id)}
              onDragStartModule={onDragStartModule}
              hideModule={hideModule}
              renderModule={renderModule}
            />
          ) : null}
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
