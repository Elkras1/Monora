import React, { useMemo, useState } from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, materialUrgency, ticketShowsInCalendar, ticketUrgency } from '../state/selectors';
import { Icon } from './icons/Icon';
import { CalendarEventModal } from './CalendarEventModal';
import { addDays, buildMonthWeeks, fmtDate, isoDate, WEEKDAYS } from '../utils/date';
import type { CalendarEvent, MaterialRequest, Ticket } from '../types';

type FilterMode = 'alle' | 'termine' | 'tickets' | 'material';

interface DisplayEntry {
  id: string;
  kind: 'manual' | 'ticket' | 'material';
  date: string;
  /** Anzeigetext ohne Art-Präfix ("Ticket ·"/"Material ·" ergänzt die Darstellung). */
  title: string;
  startTime: string | null;
  done: boolean;
  urgency: string;
  event?: CalendarEvent;
  ticket?: Ticket;
  material?: MaterialRequest;
}

/** Punktfarbe eines Eintrags im Monatsraster — dieselbe Fälligkeitslogik wie in den Dashboard-Listen
 * (überfällig rot, heute orange, morgen sand/amber, sonst grün); manuelle Termine in der Menü-/Login-Farbe. */
function dotColor(entry: DisplayEntry): string {
  if (entry.kind === 'manual') return 'var(--nav-blue)';
  if (entry.done) return 'var(--ink-faint)';
  if (entry.urgency === 'overdue') return 'var(--red)';
  if (entry.urgency === 'today') return 'var(--orange)';
  if (entry.urgency === 'soon') return 'var(--amber)';
  return 'var(--green)';
}

function dayLabel(iso: string, todayIso: string, tomorrowIso: string): string {
  if (iso === todayIso) return 'Heute';
  if (iso === tomorrowIso) return 'Morgen';
  return new Date(iso).toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

/**
 * Admin-/Manager-Dashboard-Kalender, bewusst kompakt: links eine kleine Monatsansicht (Punkte statt
 * ausgeschriebener Einträge), rechts "Heute"/gewählter Tag und "Nächste Termine". Zeigt manuelle Termine
 * (state.calendarEvents), Tickets mit Fälligkeitsdatum und — bei Berechtigung — offene Materialanfragen mit
 * Fälligkeitsdatum. Tickets/Materialanfragen werden NICHT kopiert, sondern immer live aus ihren Datenquellen
 * abgeleitet; ein Klick öffnet das jeweilige bestehende Detail (Ticket-Panel/Materialanfrage/Termin-Modal).
 */
export function DashboardCalendar() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canAllTickets = hasPerm('tickets_view_all');
  const canMaterial = hasPerm('material_manage');

  const todayIso = isoDate(new Date());
  const tomorrowIso = isoDate(addDays(new Date(), 1));
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [filter, setFilter] = useState<FilterMode>('alle');
  const [selectedDay, setSelectedDay] = useState(todayIso);
  const [modalState, setModalState] = useState<{ event?: CalendarEvent; date: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const weeks = useMemo(() => buildMonthWeeks(monthCursor), [monthCursor]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, DisplayEntry[]>();
    const push = (entry: DisplayEntry) => {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date)!.push(entry);
    };
    if (filter === 'alle' || filter === 'termine') {
      state.calendarEvents.forEach((e) =>
        push({ id: e.id, kind: 'manual', date: e.date, title: e.title, startTime: e.startTime ?? null, done: false, urgency: 'normal', event: e })
      );
    }
    if (filter === 'alle' || filter === 'tickets') {
      const visibleTickets = canAllTickets ? state.tickets : state.tickets.filter((t) => t.assignedEmployeeId === state.currentUserId);
      visibleTickets
        .filter((t) => t.type !== 'material' && ticketShowsInCalendar(t))
        .forEach((t) =>
          push({
            id: t.id,
            kind: 'ticket',
            date: t.dueDate as string,
            title: t.title,
            startTime: t.dueTime ?? null,
            done: t.status === 'erledigt',
            urgency: ticketUrgency(t, todayIso, tomorrowIso),
            ticket: t,
          })
        );
    }
    if (canMaterial && (filter === 'alle' || filter === 'material')) {
      state.materialRequests
        .filter((m) => m.status === 'offen' && !!m.requestedDate)
        .forEach((m) =>
          push({
            id: m.id,
            kind: 'material',
            date: m.requestedDate as string,
            title: getCust(state, m.locationId)?.name ?? 'Kein Objekt',
            startTime: null,
            done: false,
            urgency: materialUrgency(m, todayIso, tomorrowIso),
            material: m,
          })
        );
    }
    map.forEach((list) => list.sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.calendarEvents, state.tickets, state.materialRequests, state.customers, state.currentUserId, filter, canAllTickets, canMaterial, todayIso]);

  const entriesFor = (iso: string) => entriesByDay.get(iso) ?? [];
  const selectedEntries = entriesFor(selectedDay);

  // Nächste Termine: alles nach heute (ausser dem oben bereits gezeigten gewählten Tag), erledigte Tickets
  // ausgeblendet, auf wenige Einträge gekürzt, damit der Bereich kompakt bleibt.
  const upcoming = useMemo(() => {
    const out: DisplayEntry[] = [];
    Array.from(entriesByDay.keys())
      .filter((iso) => iso > todayIso && iso !== selectedDay)
      .sort()
      .forEach((iso) => entriesByDay.get(iso)!.filter((e) => !e.done).forEach((e) => out.push(e)));
    return out.slice(0, 6);
  }, [entriesByDay, todayIso, selectedDay]);

  const goToday = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setMonthCursor(d);
    setSelectedDay(todayIso);
  };

  const openCreate = (date: string) => setModalState({ date });
  const openEdit = (event: CalendarEvent) => setModalState({ date: event.date, event });

  const onEntryClick = (entry: DisplayEntry) => {
    if (entry.kind === 'ticket' && entry.ticket) actions.openTicketPanel(entry.ticket.id);
    else if (entry.kind === 'material' && entry.material) actions.openMaterialRequestPanel(entry.material.id);
    else if (entry.event) openEdit(entry.event);
  };

  const onEntryDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDragId(id);
  };
  const onDayDrop = (e: React.DragEvent, iso: string) => {
    e.preventDefault();
    setDropTarget(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const ev = state.calendarEvents.find((x) => x.id === id);
    if (ev && ev.date !== iso) actions.moveCalendarEvent(id, iso);
  };

  const entryLabel = (entry: DisplayEntry) => (
    <>
      {entry.kind === 'ticket' ? <span className="dash-cal-kind">Ticket · </span> : null}
      {entry.kind === 'material' ? <span className="dash-cal-kind">Material · </span> : null}
      {entry.title}
    </>
  );

  const agendaRow = (entry: DisplayEntry, showDate?: string) => (
    <div
      key={`${entry.kind}-${entry.id}`}
      className={`dash-cal-row ${entry.done ? 'is-done' : ''}`}
      onClick={() => onEntryClick(entry)}
      draggable={entry.kind === 'manual'}
      onDragStart={entry.kind === 'manual' ? (e) => onEntryDragStart(e, entry.id) : undefined}
    >
      <span className="dash-cal-dot" style={{ background: dotColor(entry) }} />
      <span className={`dash-cal-time ${showDate ? 'is-date' : ''}`}>{showDate ?? entry.startTime ?? '–'}</span>
      <span className="dash-cal-label">
        {showDate && entry.startTime ? <span className="dash-cal-kind">{entry.startTime} · </span> : null}
        {entryLabel(entry)}
      </span>
    </div>
  );

  return (
    <>
      <div className="card-head">
        <h3>Kalender</h3>
        <div className="dash-head-right">
          <div className="tabs">
            <button className={`tab ${filter === 'alle' ? 'active' : ''}`} onClick={() => setFilter('alle')}>
              Alle
            </button>
            <button className={`tab ${filter === 'termine' ? 'active' : ''}`} onClick={() => setFilter('termine')}>
              Termine
            </button>
            <button className={`tab ${filter === 'tickets' ? 'active' : ''}`} onClick={() => setFilter('tickets')}>
              Tickets
            </button>
            {canMaterial ? (
              <button className={`tab ${filter === 'material' ? 'active' : ''}`} onClick={() => setFilter('material')}>
                Material
              </button>
            ) : null}
          </div>
          <button className="dash-header-add-btn" title="Neuer Kalendereintrag" onClick={() => openCreate(selectedDay)}>
            <Icon name="plus" />
          </button>
        </div>
      </div>

      <div className="dash-cal">
        <div className="dash-cal-month">
          <div className="dash-cal-nav">
            <button className="icon-btn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
              <Icon name="chevL" />
            </button>
            <div className="dash-cal-month-label">{monthCursor.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}</div>
            <button className="icon-btn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
              <Icon name="chevR" />
            </button>
            <button className="btn btn-outline btn-sm" onClick={goToday}>
              Heute
            </button>
          </div>
          <div className="dash-cal-grid dash-cal-weekdays">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div className="dash-cal-grid" key={wi}>
              {week.map((day, di) => {
                if (!day) return <div className="dash-cal-day is-blank" key={di} />;
                const iso = isoDate(day);
                const entries = entriesFor(iso);
                return (
                  <div
                    key={di}
                    className={`dash-cal-day ${iso === todayIso ? 'is-today' : ''} ${iso === selectedDay ? 'is-selected' : ''} ${
                      dropTarget === iso ? 'is-drop-target' : ''
                    }`}
                    onClick={() => setSelectedDay(iso)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dropTarget !== iso) setDropTarget(iso);
                    }}
                    onDragLeave={() => setDropTarget((d) => (d === iso ? null : d))}
                    onDrop={(e) => onDayDrop(e, iso)}
                    title={entries.length ? `${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'}` : undefined}
                  >
                    <span className="dash-cal-day-num">{day.getDate()}</span>
                    <span className="dash-cal-dots">
                      {entries.slice(0, 3).map((entry) => (
                        <i key={`${entry.kind}-${entry.id}`} style={{ background: dotColor(entry) }} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="dash-cal-agenda">
          <div className="dash-cal-section">
            <div className="dash-cal-section-head">
              <span>{selectedDay === todayIso ? 'Heute' : dayLabel(selectedDay, todayIso, tomorrowIso)}</span>
              <span className="dash-cal-section-sub">{new Date(selectedDay).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            {selectedEntries.length ? (
              selectedEntries.map((entry) => agendaRow(entry))
            ) : (
              <div className="dash-cal-empty">Keine Einträge an diesem Tag.</div>
            )}
          </div>
          <div className="dash-cal-section">
            <div className="dash-cal-section-head">
              <span>Nächste Termine</span>
            </div>
            {upcoming.length ? (
              upcoming.map((entry) => agendaRow(entry, dayLabel(entry.date, todayIso, tomorrowIso) === 'Morgen' ? 'Morgen' : fmtDate(new Date(entry.date)).slice(0, 6)))
            ) : (
              <div className="dash-cal-empty">Keine weiteren Termine.</div>
            )}
          </div>
        </div>
      </div>

      {modalState ? (
        <CalendarEventModal event={modalState.event} defaultDate={modalState.date} onClose={() => setModalState(null)} />
      ) : null}
    </>
  );
}
