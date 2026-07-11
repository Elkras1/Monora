import React from 'react';
import { useApp, useHasPerm, useIsAdmin } from '../state/AppContext';
import { getCust } from '../state/selectors';
import { Icon } from '../components/icons/Icon';
import { Empty } from '../components/ui/Empty';
import { colorFor, initials } from '../utils/format';
import { fmtDate } from '../utils/date';
import { roleLabel } from '../data/permissions';

export function EmployeesPage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const isAdmin = useIsAdmin();
  const q = (state.filter.empSearch ?? '').toLowerCase();
  const list = state.employees.filter((e) => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q));

  const canEdit = hasPerm('emp_edit');
  const canDeactivate = hasPerm('emp_deactivate');
  const canCreate = hasPerm('emp_create');
  const canDetails = hasPerm('emp_view_details');
  const canOpen = canEdit || canDetails || isAdmin;
  const showActions = canOpen || canDeactivate || isAdmin;

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="Mitarbeiter suchen…"
            value={state.filter.empSearch ?? ''}
            onChange={(e) => actions.setFilter({ empSearch: e.target.value })}
          />
        </div>
        {canCreate ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('employee')}>
            <Icon name="plus" /> Mitarbeiter anlegen
          </button>
        ) : null}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th>Rolle</th>
                {canDetails ? (
                  <>
                    <th>Kontakt</th>
                    <th>Standorte</th>
                    <th>PIN</th>
                  </>
                ) : null}
                <th>Status</th>
                {showActions ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="person">
                        <div className="avatar" style={{ background: colorFor(e.id) }}>
                          {initials(e.name)}
                        </div>
                        <div>
                          <div className="name">{e.name}</div>
                          <div className="meta">
                            seit {fmtDate(new Date(e.startDate))}
                            {e.systemRole !== 'mitarbeiter' ? (
                              <>
                                {' '}
                                · <span style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>{roleLabel(e.systemRole)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{e.role}</td>
                    {canDetails ? (
                      <>
                        <td>
                          <div style={{ fontSize: 12.5 }}>{e.email}</div>
                          <div className="meta">{e.phone}</div>
                        </td>
                        <td>
                          {e.customerIds.length ? (
                            e.customerIds.map((cid) => {
                              const c = getCust(state, cid);
                              return c ? (
                                <span key={cid} className="badge badge-green" style={{ margin: 1 }}>
                                  {c.name}
                                </span>
                              ) : null;
                            })
                          ) : (
                            <span className="hint">keine</span>
                          )}
                        </td>
                        <td className="mono">{e.pin}</td>
                      </>
                    ) : null}
                    <td>
                      {e.status === 'aktiv' ? (
                        <span className="badge badge-mint">
                          <span className="badge-dot" />
                          Aktiv
                        </span>
                      ) : e.status === 'eingeladen' ? (
                        <span className="badge badge-amber">
                          <span className="badge-dot" />
                          Eingeladen
                        </span>
                      ) : (
                        <span className="badge badge-grey">
                          <span className="badge-dot" />
                          Deaktiviert
                        </span>
                      )}
                    </td>
                    {showActions ? (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {canOpen ? (
                            <button className="icon-btn" title={canEdit ? 'Bearbeiten' : 'Details anzeigen'} onClick={() => actions.openModal('employee', e)}>
                              <Icon name={canEdit ? 'edit' : 'eye'} />
                            </button>
                          ) : null}
                          {isAdmin ? (
                            <button className="icon-btn" onClick={() => actions.deleteEmployee(e.id)}>
                              <Icon name="trash" />
                            </button>
                          ) : canDeactivate ? (
                            <button
                              className="icon-btn"
                              onClick={() => actions.toggleEmployeeStatus(e.id)}
                              title={e.status === 'aktiv' ? 'Deaktivieren' : 'Aktivieren'}
                            >
                              <Icon name={e.status === 'aktiv' ? 'close' : 'check'} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <Empty icon="employees" text="Keine Mitarbeiter gefunden." />
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
