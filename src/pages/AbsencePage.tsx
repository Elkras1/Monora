import React from 'react';
import { useApp, useHasPerm, useIsAdmin } from '../state/AppContext';
import { getEmp } from '../state/selectors';
import { AbsenceTypeBadge, StatusBadge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { colorFor, initials } from '../utils/format';
import { fmtDate } from '../utils/date';

const TABS = ['alle', 'beantragt', 'genehmigt', 'abgelehnt'] as const;

export function AbsencePage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const isAdmin = useIsAdmin();
  const filterStatus = state.filter.absStatus || 'alle';
  const canAll = hasPerm('absence_view_all');

  let list = state.absences.filter((a) => filterStatus === 'alle' || a.status === filterStatus);
  if (!canAll) list = list.filter((a) => a.employeeId === state.currentUserId);
  list = [...list].sort((a, b) => b.start.localeCompare(a.start));

  return (
    <>
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
            <Icon name="plus" /> Antrag erfassen
          </button>
        ) : null}
      </div>
      {!canAll ? <div className="hint" style={{ marginBottom: 10 }}>Du siehst nur deine eigenen Anträge.</div> : null}
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
    </>
  );
}
