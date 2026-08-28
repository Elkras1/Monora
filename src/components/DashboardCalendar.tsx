import React, { useMemo, useState } from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { ticketShowsInCalendar, ticketUrgency } from '../state/selectors';
import { dashboardUrgencyRowClass } from './ui/Badge';
import { Icon } from './icons/Icon';
import { CalendarEventModal } from './CalendarEventModal';
import { addDays, buildMonthWeeks, isoDate, WEEKDAYS } from '../utils/date';
import type { CalendarEvent, Ticket } from '../types';

type FilterMode = 'alle' | 'termine' | 'tickets';

interface DisplayEntry {
  id: string;
  kind: 'manual' | 'ticket';
  title: string;
  startTime: string | null;
  event?: CalendarEvent;
  ticket?: Ticket;
}

/** Helle Tint-Farbe für einen manuellen Termin, abgeleitet aus der im Modal gewählten Akzentfarbe (siehe
 * COLOR_OPTIONS in CalendarEventModal.tsx) — bewusst nur die bereits vorhandenen *-tint-Tokens, keine neuen
 * Farben, damit die Fläche dezent bleibt statt eine kräftige Vollfarbe zu zeigen. */
function manualEventBg(color: string | null | undefined): string {
  if (color === 'var(--green)') return 'var(--green-tint)';
  if (color === 'var(--orange)') return 'var(--orange-tint)';
  if (color === 'var(--red)') return 'var(--red-tint)';
  if (color === 'var(--amber)') return 'var(--amber-tint)';
  return 'var(--primary-tint)';
}

/**
 * Admin-/Manager-Dashboard-Kalender: ruhige Monatsansicht (Apple-/iCloud-Stil) mit manuellen Terminen
 * (state.calendarEvents) und automatisch eingeblendeten Tickets mit Fälligkeitsdatum (state.tickets,
 * siehe ticketShowsInCalendar). Tickets werden NICHT kopiert — ein Ticket-Eintrag ist immer eine reine
 * Ableitung aus dem Ticket selbst, ein Klick öffnet direkt das bestehende Ticket-Panel.
 */
export function DashboardCalendar() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canAllTickets = hasPerm('tickets_view_all');

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

  const visibleTickets = canAllTickets ? state.tickets : state.tickets.filter((t) => t.assignedEmployeeId === state.currentUserId);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, DisplayEntry[]>();
    const push = (iso: string, entry: DisplayEntry) => {
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso)!.push(entry);
    };
    if (filter !== 'tickets') {
      state.calendarEvents.forEach((e) => push(e.date, { id: e.id, kind: 'manual', title: e.title, startTime: e.startTime ?? null, event: e }));
    }
    if (filter !== 'termine') {
      visibleTickets
        .filter(ticketShowsInCalendar)
        .forEach((t) => push(t.dueDate as string, { id: t.id, kind: 'ticket', title: t.title, startTime: t.dueTime ?? null, ticket: t }));
    }
    map.forEach((list) => list.sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')));
    return map;
  }, [state.calendarEvents, visibleTickets, filter]);

  const entriesFor = (iso: string) => entriesByDay.get(iso) ?? [];
  const selectedEntries = entriesFor(selectedDay);

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
    else if (entry.event) openEdit(entry.event);
  };

  const onEntryDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
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

  return (
    <>
      <div className="card-head">
        <h3>Kalender</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
          </div>
          <button className="dash-header-add-btn" title="Neuer Kalendereintrag" onClick={() => openCreate(selectedDay)}>
            <Icon name="plus" />
          </button>
        </div>
      </div>

      <div className="cal-dash-nav">
        <div className="week-nav">
          <button className="icon-btn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
            <Icon name="chevL" />
          </button>
          <div className="cal-dash-month-label">{monthCursor.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}</div>
          <button className="icon-btn" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
            <Icon name="chevR" />
          </button>
        </div>
        <button className="btn btn-outline btn-sm" onClick={goToday}>
          Heute
        </button>
      </div>

      <div className="cal-dash-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div className="cal-dash-week" key={wi}>
          {week.map((day, di) => {
            if (!day) return <div className="cal-dash-day is-blank" key={di} />;
            const iso = isoDate(day);
            const entries = entriesFor(iso);
            const shown = entries.slice(0, 3);
            const more = entries.length - shown.length;
            const wd = day.getDay();
            const isWeekend = wd === 0 || wd === 6;
            return (
              <div
                key={di}
                className={`cal-dash-day ${iso === todayIso ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''} ${
                  iso === selectedDay ? 'is-selected' : ''
                } ${dropTarget === iso ? 'is-drop-target' : ''}`}
                onClick={() => (entries.length === 0 ? openCreate(iso) : setSelectedDay(iso))}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dropTarget !== iso) setDropTarget(iso);
                }}
                onDragLeave={() => setDropTarget((d) => (d === iso ? null : d))}
                onDrop={(e) => onDayDrop(e, iso)}
              >
                <div className="cal-dash-day-top">
                  <span className="cal-dash-day-num">{day.getDate()}</span>
                  <button
                    className="cal-dash-day-add"
                    title="Neuer Termin"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreate(iso);
                    }}
                  >
                    <Icon name="plus" />
                  </button>
                </div>
                <div className="cal-dash-day-entries">
                  {shown.map((entry) => {
                    const urgency = entry.ticket ? ticketUrgency(entry.ticket, todayIso, tomorrowIso) : 'normal';
                    const isDoneTicket = entry.kind === 'ticket' && entry.ticket?.status === 'erledigt';
                    const className =
                      entry.kind === 'ticket' ? (isDoneTicket ? '' : dashboardUrgencyRowClass(urgency)) : '';
                    const style: React.CSSProperties =
                      entry.kind === 'manual'
                        ? { background: manualEventBg(entry.event?.color) }
                        : isDoneTicket
                          ? { background: 'var(--surface-alt)' }
                          : {};
                    return (
                      <div
                        key={entry.id}
                        className={`cal-dash-entry ${className}`}
                        style={style}
                        draggable={entry.kind === 'manual'}
                        onDragStart={entry.kind === 'manual' ? (e) => onEntryDragStart(e, entry.id) : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEntryClick(entry);
                        }}
                        title={entry.title}
                      >
                        {entry.startTime ? `${entry.startTime} ` : ''}
                        {entry.kind === 'ticket' ? 'Ticket: ' : ''}
                        {entry.title}
                      </div>
                    );
                  })}
                  {more > 0 ? <div className="cal-dash-day-more">+{more} weitere</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="cal-dash-agenda">
        <div className="cal-dash-agenda-head">{selectedDay === todayIso ? 'Heute' : new Date(selectedDay).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
        {selectedEntries.length ? (
          selectedEntries.map((entry) => (
            <div key={entry.id} className="cal-dash-agenda-row" onClick={() => onEntryClick(entry)}>
              <span className="cal-dash-agenda-time">{entry.startTime ?? '–'}</span>
              <span className="cal-dash-agenda-lbl">
                {entry.kind === 'ticket' ? 'Ticket: ' : ''}
                {entry.title}
              </span>
            </div>
          ))
        ) : (
          <div className="hint">Keine Einträge an diesem Tag.</div>
        )}
      </div>

      {modalState ? (
        <CalendarEventModal event={modalState.event} defaultDate={modalState.date} onClose={() => setModalState(null)} />
      ) : null}
    </>
  );
}
