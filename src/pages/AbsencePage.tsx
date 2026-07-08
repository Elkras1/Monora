import React from 'react';
import { useApp, useHasPerm, useIsAdmin } from '../state/AppContext';
import { getEmp } from '../state/selectors';
import { AbsenceTypeBadge, StatusBadge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { KpiCard } from '../components/ui/KpiCard';
import { AbsenceCalendar } from '../components/AbsenceCalendar';
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

  const roleScoped = canAll ? state.absences : state.absences.filter((a) => a.employeeId === state.currentUserId);
  const todayIso = isoDate(new Date());
  const openCount = roleScoped.filter((a) => a.status === 'beantragt').length;
  const approvedCount = roleScoped.filter((a) => a.status === 'genehmigt').length;
  const currentlyAbsentCount = new Set(
    roleScoped.filter((a) => a.status === 'genehmigt' && a.start <= todayIso && a.end >= todayIso).map((a) => a.employeeId)
  ).size;

  let list = roleScoped.filter((a) => filterStatus === 'alle' || a.status === filterStatus);
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
        {hasPerm('absence_request') ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('absence')}>
            <Icon name="plus" /> Abwesenheit hinzufügen
          </button>
        ) : null}
      </div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {VIEW_TABS.map((v) => (
          <button key={v.id} className={`tab ${view === v.id ? 'active' : ''}`} onClick={() => actions.setFilter({ absView: v.id })}>
            {v.label}
          </button>
        ))}
      </div>
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
        <div className="card">
          {list.length ? (
            <AbsenceCalendar absences={list} mode={view} />
          ) : (
            <Empty icon="absence" text="Keine Einträge in dieser Ansicht." />
          )}
        </div>
      )}
    </>
  );
}
