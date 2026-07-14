import React, { useMemo, useState } from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { TicketPriorityBadge, TicketStatusBadge, ticketCalendarColor } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import type { Ticket } from '../types';
import { addDays, buildMonthWeeks, fmtDate, isoDate, mondayOf, WEEKDAYS } from '../utils/date';

const VIEW_TABS = [
  { id: 'day', label: 'Tag' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
  { id: 'list', label: 'Liste' },
] as const;

/**
 * Separater Ticket-Kalender für Admin/Manager — bewusst eigenständig vom Mitarbeiter-Dienstplan
 * (SchedulePage/ScheduleMatrix), auch wenn das Grundlayout (Tag/Woche-Spalten, Monatsraster) ähnlich
 * aufgebaut ist. Zeigt Tickets nach Fälligkeitsdatum, mit Drag & Drop zum Verschieben des Termins.
 */
export function TicketCalendarPage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canManage = hasPerm('tickets_edit');
  const canAll = hasPerm('tickets_view_all');
  const view = state.filter.tickCalView ?? 'month';
  const [cursor, setCursor] = useState(() => new Date());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const todayIso = isoDate(new Date());

  const scoped = useMemo(
    () => (canAll ? state.tickets : state.tickets.filter((t) => t.assignedEmployeeId === state.currentUserId)),
    [state.tickets, canAll, state.currentUserId]
  );
  const byDate = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    scoped.forEach((t) => {
      if (!t.dueDate) return;
      if (!map.has(t.dueDate)) map.set(t.dueDate, []);
      map.get(t.dueDate)!.push(t);
    });
    map.forEach((arr) => arr.sort((a, b) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99')));
    return map;
  }, [scoped]);

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };
  const onDragOver = (e: React.DragEvent, iso: string) => {
    if (!canManage) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget !== iso) setDropTarget(iso);
  };
  const onDrop = (e: React.DragEvent, iso: string) => {
    if (!canManage) return;
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData('text/plain');
    const t = scoped.find((x) => x.id === id);
    if (t && t.dueDate !== iso) actions.moveTicketDate(id, iso, t.dueTime);
    setDragId(null);
  };

  const TicketChip = ({ t, compact }: { t: Ticket; compact?: boolean }) => {
    const cust = getCust(state, t.customerId);
    const emp = getEmp(state, t.assignedEmployeeId);
    const color = ticketCalendarColor(t.status, t.priority);
    return (
      <div
        className={`tick-cal-chip ${compact ? 'is-compact' : ''}`}
        style={{ borderLeftColor: color, background: `${color}1a` }}
        draggable={canManage}
        onDragStart={(e) => onDragStart(e, t.id)}
        onClick={() => actions.openTicketPanel(t.id)}
        title={`${t.title} · ${cust ? cust.name : ''}`}
      >
        <div className="tick-cal-chip-top">
          {t.dueTime ? <span className="mono">{t.dueTime}</span> : null}
          <span className="tick-cal-chip-title">{t.title}</span>
        </div>
        {!compact ? (
          <div className="tick-cal-chip-meta">
            {cust ? cust.name : 'Kein Objekt'} · {emp ? emp.name : 'Nicht zugewiesen'}
          </div>
        ) : null}
      </div>
    );
  };

  const monthWeeks = useMemo(() => buildMonthWeeks(new Date(cursor.getFullYear(), cursor.getMonth(), 1)), [cursor]);
  const weekStart = mondayOf(cursor);
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const navLabel =
    view === 'month'
      ? cursor.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
      : view === 'week'
      ? `KW · ${fmtDate(weekStart)} – ${fmtDate(addDays(weekStart, 6))}`
      : fmtDate(cursor);

  const step = (dir: 1 | -1) => {
    setCursor((d) => {
      if (view === 'month') return new Date(d.getFullYear(), d.getMonth() + dir, 1);
      if (view === 'week') return addDays(d, dir * 7);
      return addDays(d, dir);
    });
  };

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {VIEW_TABS.map((v) => (
            <button key={v.id} className={`tab ${view === v.id ? 'active' : ''}`} onClick={() => actions.setFilter({ tickCalView: v.id })}>
              {v.label}
            </button>
          ))}
        </div>
        {canManage ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('ticket', { date: isoDate(cursor) })}>
            <Icon name="plus" /> Ticket eintragen
          </button>
        ) : null}
      </div>

      {view !== 'list' ? (
        <div className="week-nav" style={{ marginBottom: 14 }}>
          <button className="icon-btn" onClick={() => step(-1)}>
            <Icon name="chevL" />
          </button>
          <div style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", minWidth: 190, textAlign: 'center', fontSize: 14 }}>{navLabel}</div>
          <button className="icon-btn" onClick={() => step(1)}>
            <Icon name="chevR" />
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setCursor(new Date())}>
            Heute
          </button>
        </div>
      ) : null}

      <div className="sched-legend">
        <span>
          <i style={{ background: 'var(--ink-faint)' }} /> Neu
        </span>
        <span>
          <i style={{ background: 'var(--primary)' }} /> Geplant
        </span>
        <span>
          <i style={{ background: 'var(--orange)' }} /> In Bearbeitung
        </span>
        <span>
          <i style={{ background: 'var(--red)' }} /> Dringend
        </span>
        <span>
          <i style={{ background: 'var(--green)' }} /> Erledigt
        </span>
      </div>

      {view === 'month' ? (
        <>
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
                const dayTickets = byDate.get(iso) ?? [];
                const shown = dayTickets.slice(0, 2);
                const more = dayTickets.length - shown.length;
                return (
                  <div
                    key={di}
                    className={`abs-cal-day ${iso === todayIso ? 'is-today' : ''} ${dropTarget === iso ? 'is-drop-target' : ''}`}
                    onDragOver={(e) => onDragOver(e, iso)}
                    onDragLeave={() => setDropTarget((d) => (d === iso ? null : d))}
                    onDrop={(e) => onDrop(e, iso)}
                  >
                    <div className="abs-cal-day-num">{day.getDate()}</div>
                    <div className="me-month-chips">
                      {shown.map((t) => (
                        <TicketChip key={t.id} t={t} compact />
                      ))}
                      {more > 0 ? <div className="abs-cal-more">+{more}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      ) : null}

      {view === 'week' ? (
        <div className="sched-cal-scroll">
          <div className="cal-grid7">
            {weekDays.map((d) => {
              const iso = isoDate(d);
              const dayTickets = byDate.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  className={`cal-col ${iso === todayIso ? 'is-today' : ''} ${dropTarget === iso ? 'is-drop-target' : ''}`}
                  onDragOver={(e) => onDragOver(e, iso)}
                  onDragLeave={() => setDropTarget((dt) => (dt === iso ? null : dt))}
                  onDrop={(e) => onDrop(e, iso)}
                >
                  <div className="cal-col-head">
                    {WEEKDAYS[(d.getDay() + 6) % 7]} <span className="d">{d.getDate()}</span>
                    {iso === todayIso ? <span className="today-dot" /> : null}
                  </div>
                  <div className="cal-col-body">
                    {dayTickets.length ? dayTickets.map((t) => <TicketChip key={t.id} t={t} />) : <div className="cal-empty-hint">Keine Tickets</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === 'day' ? (
        <div
          className={`mob-day-list ${dropTarget === isoDate(cursor) ? 'is-drop-target' : ''}`}
          onDragOver={(e) => onDragOver(e, isoDate(cursor))}
          onDrop={(e) => onDrop(e, isoDate(cursor))}
        >
          {(byDate.get(isoDate(cursor)) ?? []).length ? (
            (byDate.get(isoDate(cursor)) ?? []).map((t) => <TicketChip key={t.id} t={t} />)
          ) : (
            <Empty icon="ticket" text="Keine Tickets an diesem Tag." />
          )}
        </div>
      ) : null}

      {view === 'list' ? (
        <div className="card">
          {scoped.filter((t) => t.dueDate).length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fällig</th>
                    <th>Titel</th>
                    <th>Kunde / Objekt</th>
                    <th>Zuständig</th>
                    <th>Priorität</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...scoped]
                    .filter((t) => t.dueDate)
                    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
                    .map((t) => {
                      const cust = getCust(state, t.customerId);
                      const emp = getEmp(state, t.assignedEmployeeId);
                      return (
                        <tr key={t.id} onClick={() => actions.openTicketPanel(t.id)} style={{ cursor: 'pointer' }}>
                          <td className="mono">
                            {fmtDate(new Date(t.dueDate as string))}
                            {t.dueTime ? ` · ${t.dueTime}` : ''}
                          </td>
                          <td>{t.title}</td>
                          <td>{cust ? cust.name : '–'}</td>
                          <td>{emp ? emp.name : '–'}</td>
                          <td>
                            <TicketPriorityBadge priority={t.priority} />
                          </td>
                          <td>
                            <TicketStatusBadge status={t.status} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="ticket" text="Keine terminierten Tickets." />
          )}
        </div>
      ) : null}
    </>
  );
}
