import React, { useMemo, useState } from 'react';
import { useApp, useHasPerm, useIsAdmin } from '../state/AppContext';
import { getEmp } from '../state/selectors';
import { AbsenceTypeBadge, StatusBadge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { KpiCard } from '../components/ui/KpiCard';
import { AbsenceCalendar } from '../components/AbsenceCalendar';
import { AbsenceMatrix } from '../components/AbsenceMatrix';
import { colorFor, initials } from '../utils/format';
import { fmtDate, isoDate } from '../utils/date';

const TABS = ['alle', 'beantragt', 'genehmigt', 'abgelehnt'] as const;
const VIEW_TABS = [
  { id: 'list', label: 'Liste' },
  { id: 'month', label: 'Monat' },
  { id: 'year', label: 'Jahr' },
] as const;

export function AbsencePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const isAdmin = useIsAdmin();
  const filterStatus = state.filter.absStatus || 'alle';
  const view = state.filter.absView || 'list';
  const canAll = hasPerm('absence_view_all');
  const canManage = hasPerm('absence_approve');
  const canCreate = hasPerm('absence_request');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const scopedEmployees = useMemo(
    () => (canAll ? state.employees : state.employees.filter((e) => e.id === state.currentUserId)),
    [state.employees, canAll, state.currentUserId]
  );
  const roleScoped = canAll ? state.absences : state.absences.filter((a) => a.employeeId === state.currentUserId);

  const roleOptions = useMemo(
    () => Array.from(new Set(scopedEmployees.map((e) => e.role))).sort((a, b) => a.localeCompare(b)),
    [scopedEmployees]
  );
  const custOptions = useMemo(() => {
    const ids = new Set<string>();
    scopedEmployees.forEach((e) => e.customerIds.forEach((id) => ids.add(id)));
    return state.customers.filter((c) => ids.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedEmployees, state.customers]);

  const empFilter = canAll ? state.filter.absEmpFilter || '' : '';
  const typeFilter = canAll ? state.filter.absTypeFilter || '' : '';
  const roleFilter = canAll ? state.filter.absRoleFilter || '' : '';
  const custFilter = canAll ? state.filter.absCustFilter || '' : '';
  const hasActiveFilters = !!(empFilter || typeFilter || roleFilter || custFilter);

  const employeeMatchesFilter = (e: (typeof scopedEmployees)[number]) => {
    if (empFilter && e.id !== empFilter) return false;
    if (roleFilter && e.role !== roleFilter) return false;
    if (custFilter && !e.customerIds.includes(custFilter)) return false;
    return true;
  };
  // Matrix-Zeilen: nur aktive Mitarbeiter (für die Abwesenheitsplanung relevant).
  const matrixEmployees = useMemo(
    () => scopedEmployees.filter((e) => e.status === 'aktiv' && employeeMatchesFilter(e)),
    [scopedEmployees, empFilter, roleFilter, custFilter]
  );
  // Für die Liste/Zeitachsen-Filterung zählt nur, ob Mitarbeiter/Team/Standort passen — der Status
  // (aktiv/inaktiv) des Mitarbeiters darf bestehende Abwesenheitsdaten dort nicht ausblenden.
  const filteredEmployeeIds = useMemo(() => new Set(scopedEmployees.filter(employeeMatchesFilter).map((e) => e.id)), [scopedEmployees, empFilter, roleFilter, custFilter]);

  const todayIso = isoDate(new Date());
  const openCount = roleScoped.filter((a) => a.status === 'beantragt').length;
  const approvedCount = roleScoped.filter((a) => a.status === 'genehmigt').length;
  const currentlyAbsentCount = new Set(
    roleScoped.filter((a) => a.status === 'genehmigt' && a.start <= todayIso && a.end >= todayIso).map((a) => a.employeeId)
  ).size;

  let list = roleScoped.filter((a) => {
    if (filterStatus !== 'alle' && a.status !== filterStatus) return false;
    if (typeFilter && a.type !== typeFilter) return false;
    if (!filteredEmployeeIds.has(a.employeeId)) return false;
    return true;
  });
  list = [...list].sort((a, b) => b.start.localeCompare(a.start));

  return (
    <>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <KpiCard icon="absence" label="Offene Anträge" value={openCount} bg="var(--amber-tint)" fg="#93670A" delta="zur Prüfung" />
        <KpiCard icon="check" label="Genehmigt" value={approvedCount} bg="var(--primary-tint)" fg="var(--primary-dark)" delta="insgesamt" />
        <KpiCard
          icon="users2"
          label="Aktuell abwesend"
          value={currentlyAbsentCount}
          bg="var(--surface-alt)"
          fg="var(--ink-soft)"
          delta="heute"
        />
      </div>

      <div className="toolbar">
        <div className="tabs">
          {TABS.map((s) => (
            <button
              key={s}
              className={`tab ${filterStatus === s ? 'active' : ''}`}
              onClick={() => actions.setFilter({ absStatus: s })}
            >
              {s === 'alle' ? 'Alle' : s === 'beantragt' ? 'Ausstehend' : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {canCreate ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('absence')}>
            <Icon name="plus" /> Abwesenheit hinzufügen
          </button>
        ) : null}
      </div>

      <div className="abs-matrix-toolbar">
        <div className="tabs">
          {VIEW_TABS.map((v) => (
            <button key={v.id} className={`tab ${view === v.id ? 'active' : ''}`} onClick={() => actions.setFilter({ absView: v.id })}>
              {v.label}
            </button>
          ))}
        </div>
        {canAll ? (
          <button className={`abs-matrix-filter-toggle ${filtersOpen ? 'is-active' : ''}`} onClick={() => setFiltersOpen((o) => !o)}>
            <Icon name="search" /> Filter{hasActiveFilters ? ' · aktiv' : ''}
            <Icon name={filtersOpen ? 'chevUp' : 'chevDown'} />
          </button>
        ) : null}
      </div>

      {canAll && filtersOpen ? (
        <div className="abs-matrix-filters">
          <select value={empFilter} onChange={(e) => actions.setFilter({ absEmpFilter: e.target.value })}>
            <option value="">Alle Mitarbeiter</option>
            {scopedEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select value={roleFilter} onChange={(e) => actions.setFilter({ absRoleFilter: e.target.value })}>
            <option value="">Alle Teams</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={custFilter} onChange={(e) => actions.setFilter({ absCustFilter: e.target.value })}>
            <option value="">Alle Standorte</option>
            {custOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => actions.setFilter({ absTypeFilter: e.target.value })}>
            <option value="">Alle Arten</option>
            <option value="Urlaub">Ferien</option>
            <option value="Krankheit">Krankheit</option>
            <option value="Unfall">Unfall</option>
            <option value="Unbezahlt">Unbezahlt</option>
            <option value="Sonstiges">Sonstiges</option>
          </select>
          {hasActiveFilters ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => actions.setFilter({ absEmpFilter: '', absRoleFilter: '', absCustFilter: '', absTypeFilter: '' })}
            >
              Filter zurücksetzen
            </button>
          ) : null}
        </div>
      ) : null}

      {!canAll ? <div className="hint" style={{ marginBottom: 10 }}>Du siehst nur deine eigenen Anträge.</div> : null}

      {view === 'list' ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mitarbeiter</th>
                  <th>Art</th>
                  <th>Zeitraum</th>
                  <th>Tage</th>
                  <th>Notiz</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.length ? (
                  list.map((a) => {
                    const e = getEmp(state, a.employeeId);
                    if (!e) return null;
                    const days = Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 86400000) + 1;
                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="person">
                            <div className="avatar" style={{ background: colorFor(e.id) }}>
                              {initials(e.name)}
                            </div>
                            <span>{e.name}</span>
                          </div>
                        </td>
                        <td>
                          <AbsenceTypeBadge type={a.type} />
                        </td>
                        <td className="mono">
                          {fmtDate(new Date(a.start))} – {fmtDate(new Date(a.end))}
                        </td>
                        <td>{days}</td>
                        <td style={{ maxWidth: 180, color: 'var(--ink-soft)', fontSize: 12.3 }}>{a.note || '–'}</td>
                        <td>
                          <StatusBadge status={a.status} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {a.status === 'beantragt' && hasPerm('absence_approve') ? (
                              <button className="icon-btn" title="Genehmigen" onClick={() => actions.setAbsStatus(a.id, 'genehmigt')}>
                                <Icon name="check" />
                              </button>
                            ) : null}
                            {a.status === 'beantragt' && hasPerm('absence_reject') ? (
                              <button className="icon-btn" title="Ablehnen" onClick={() => actions.setAbsStatus(a.id, 'abgelehnt')}>
                                <Icon name="close" />
                              </button>
                            ) : null}
                            {isAdmin ? (
                              <button className="icon-btn" onClick={() => actions.deleteAbsence(a.id)}>
                                <Icon name="trash" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <Empty icon="absence" text="Keine Einträge in dieser Ansicht." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="abs-matrix-desktop card">
            {matrixEmployees.length ? (
              <AbsenceMatrix mode={view === 'year' ? 'year' : 'month'} employees={matrixEmployees} absences={list} canManage={canManage} canCreate={canCreate} />
            ) : (
              <Empty icon="absence" text="Keine Mitarbeiter in dieser Ansicht." />
            )}
          </div>
          <div className="abs-matrix-mobile card">
            {list.length ? (
              <AbsenceCalendar absences={list} mode={view} canManage={hasPerm('absence_approve')} />
            ) : (
              <Empty icon="absence" text="Keine Einträge in dieser Ansicht." />
            )}
          </div>
        </>
      )}
    </>
  );
}
