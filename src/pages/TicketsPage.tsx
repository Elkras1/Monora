import React, { useMemo, useState } from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { TicketPriorityBadge, TicketStatusBadge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import type { TicketType } from '../types';
import { fmtDate } from '../utils/date';

/** Gemeinsame Ticketliste für "Alle Tickets" (kein fixedType) und "Aufgaben" (fixedType="aufgabe"). */
export function TicketsPage({ fixedType }: { fixedType?: TicketType }) {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canAll = hasPerm('tickets_view_all');
  const canCreate = hasPerm('tickets_create');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const roleScoped = useMemo(
    () => (canAll ? state.tickets : state.tickets.filter((t) => t.assignedEmployeeId === state.currentUserId)),
    [state.tickets, canAll, state.currentUserId]
  );

  const typeFilter = fixedType ?? state.filter.tickType ?? '';
  const custFilter = state.filter.tickCust ?? '';
  const empFilter = state.filter.tickEmp ?? '';
  const managerFilter = state.filter.tickManager ?? '';
  const statusFilter = state.filter.tickStatus ?? '';
  const priorityFilter = state.filter.tickPriority ?? '';
  const dateFrom = state.filter.tickDateFrom ?? '';
  const dateTo = state.filter.tickDateTo ?? '';
  const overdueOnly = !!state.filter.tickOverdueOnly;
  const hasActiveFilters = !!(
    custFilter ||
    empFilter ||
    managerFilter ||
    statusFilter ||
    priorityFilter ||
    dateFrom ||
    dateTo ||
    overdueOnly ||
    (!fixedType && typeFilter)
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const list = useMemo(() => {
    return roleScoped
      .filter((t) => {
        if (typeFilter && t.type !== typeFilter) return false;
        if (custFilter && t.customerId !== custFilter) return false;
        if (empFilter && t.assignedEmployeeId !== empFilter) return false;
        if (managerFilter && t.assignedManagerId !== managerFilter) return false;
        if (statusFilter && t.status !== statusFilter) return false;
        if (priorityFilter && t.priority !== priorityFilter) return false;
        if (dateFrom && (!t.dueDate || t.dueDate < dateFrom)) return false;
        if (dateTo && (!t.dueDate || t.dueDate > dateTo)) return false;
        if (overdueOnly && !(t.dueDate && t.dueDate < todayIso && t.status !== 'erledigt' && t.status !== 'abgeschlossen')) return false;
        return true;
      })
      .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? '') || b.createdAt.localeCompare(a.createdAt));
  }, [roleScoped, typeFilter, custFilter, empFilter, managerFilter, statusFilter, priorityFilter, dateFrom, dateTo, overdueOnly, todayIso]);

  return (
    <>
      <div className="toolbar">
        <div className="sub" style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>
          {list.length} Ticket{list.length === 1 ? '' : 's'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`abs-matrix-filter-toggle ${filtersOpen ? 'is-active' : ''}`} onClick={() => setFiltersOpen((o) => !o)}>
            <Icon name="search" /> Filter{hasActiveFilters ? ' · aktiv' : ''}
            <Icon name={filtersOpen ? 'chevUp' : 'chevDown'} />
          </button>
          {canCreate ? (
            <button className="btn btn-primary" onClick={() => actions.openModal('ticket')}>
              <Icon name="plus" /> Ticket erstellen
            </button>
          ) : null}
        </div>
      </div>

      {filtersOpen ? (
        <div className="abs-matrix-filters">
          {!fixedType ? (
            <select value={typeFilter} onChange={(e) => actions.setFilter({ tickType: e.target.value })}>
              <option value="">Alle Arten</option>
              <option value="aufgabe">Aufgabe</option>
              <option value="material">Material</option>
            </select>
          ) : null}
          <select value={custFilter} onChange={(e) => actions.setFilter({ tickCust: e.target.value })}>
            <option value="">Alle Kunden</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={empFilter} onChange={(e) => actions.setFilter({ tickEmp: e.target.value })}>
            <option value="">Alle Mitarbeiter</option>
            {state.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select value={managerFilter} onChange={(e) => actions.setFilter({ tickManager: e.target.value })}>
            <option value="">Alle Manager</option>
            {state.employees
              .filter((e) => e.systemRole === 'manager' || e.systemRole === 'admin')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          <select value={statusFilter} onChange={(e) => actions.setFilter({ tickStatus: e.target.value })}>
            <option value="">Alle Status</option>
            <option value="neu">Neu</option>
            <option value="geplant">Geplant</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="wartet_rueckmeldung">Wartet auf Rückmeldung</option>
            <option value="erledigt">Erledigt</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>
          <select value={priorityFilter} onChange={(e) => actions.setFilter({ tickPriority: e.target.value })}>
            <option value="">Alle Prioritäten</option>
            <option value="niedrig">Niedrig</option>
            <option value="normal">Normal</option>
            <option value="hoch">Hoch</option>
            <option value="dringend">Dringend</option>
          </select>
          <div className="filter-date-group">
            <span className="filter-date-label">Von</span>
            <input type="date" value={dateFrom} onChange={(e) => actions.setFilter({ tickDateFrom: e.target.value })} />
            <span className="filter-date-sep">–</span>
            <span className="filter-date-label">Bis</span>
            <input type="date" value={dateTo} onChange={(e) => actions.setFilter({ tickDateTo: e.target.value })} />
          </div>
          {hasActiveFilters ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() =>
                actions.setFilter({
                  tickType: fixedType ? typeFilter : '',
                  tickCust: '',
                  tickEmp: '',
                  tickManager: '',
                  tickStatus: '',
                  tickPriority: '',
                  tickDateFrom: '',
                  tickDateTo: '',
                  tickOverdueOnly: false,
                })
              }
            >
              Filter zurücksetzen
            </button>
          ) : null}
        </div>
      ) : null}

      {overdueOnly ? (
        <div className="badge badge-red" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => actions.setFilter({ tickOverdueOnly: false })}>
          <Icon name="alert" /> Nur überfällige Tickets · zurücksetzen
        </div>
      ) : null}

      {list.length ? (
        <>
          <div className="card tick-list-desktop">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nr.</th>
                    <th>Titel</th>
                    <th>Typ</th>
                    <th>Kunde / Objekt</th>
                    <th>Zuständig</th>
                    <th>Fällig</th>
                    <th>Priorität</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => {
                    const cust = getCust(state, t.customerId);
                    const emp = getEmp(state, t.assignedEmployeeId);
                    const overdue = !!t.dueDate && t.dueDate < todayIso && t.status !== 'erledigt' && t.status !== 'abgeschlossen';
                    return (
                      <tr key={t.id} onClick={() => actions.openTicketPanel(t.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{t.ticketNumber}</td>
                        <td>{t.title}</td>
                        <td>{t.type === 'material' ? 'Material' : 'Aufgabe'}</td>
                        <td>{cust ? cust.name : '–'}</td>
                        <td>{emp ? emp.name : '–'}</td>
                        <td className="mono" style={{ color: overdue ? 'var(--red)' : undefined, fontWeight: overdue ? 700 : undefined }}>
                          {t.dueDate ? fmtDate(new Date(t.dueDate)) : '–'}
                        </td>
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
          </div>

          <div className="tick-list-mobile">
            {list.map((t) => {
              const cust = getCust(state, t.customerId);
              const emp = getEmp(state, t.assignedEmployeeId);
              const overdue = !!t.dueDate && t.dueDate < todayIso && t.status !== 'erledigt' && t.status !== 'abgeschlossen';
              return (
                <div key={t.id} className="eval-card" onClick={() => actions.openTicketPanel(t.id)}>
                  <div className="eval-card-top">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.2 }}>{t.title}</div>
                      <div className="eval-card-meta">
                        {t.ticketNumber} · {cust ? cust.name : 'Kein Objekt'}
                      </div>
                    </div>
                    <TicketStatusBadge status={t.status} />
                  </div>
                  <div className="eval-card-foot">
                    <div className="eval-card-meta">
                      {emp ? emp.name : 'Nicht zugewiesen'}
                      {t.dueDate ? (
                        <span style={{ color: overdue ? 'var(--red)' : undefined, fontWeight: overdue ? 700 : undefined }}>
                          {' '}
                          · fällig {fmtDate(new Date(t.dueDate))}
                        </span>
                      ) : null}
                    </div>
                    <TicketPriorityBadge priority={t.priority} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Empty icon="ticket" text="Keine Tickets in dieser Ansicht." />
      )}
    </>
  );
}
