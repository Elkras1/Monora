import React from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { Icon } from '../components/icons/Icon';
import { Empty } from '../components/ui/Empty';

export function ServicesPage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canManage = hasPerm('services_manage');
  const list = [...state.services].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="toolbar">
        <div className="hint">Leistungen, die bei Einsätzen und beim Einstempeln ausgewählt werden können.</div>
        {canManage ? (
          <button className="btn btn-primary" onClick={() => actions.openModal('service')}>
            <Icon name="plus" /> Neue Leistung
          </button>
        ) : null}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Leistung</th>
                <th>Beschreibung</th>
                <th>Status</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>{s.description || '–'}</td>
                    <td>
                      {s.active ? (
                        <span className="badge badge-mint">
                          <span className="badge-dot" />
                          Aktiv
                        </span>
                      ) : (
                        <span className="badge badge-grey">
                          <span className="badge-dot" />
                          Inaktiv
                        </span>
                      )}
                    </td>
                    {canManage ? (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="icon-btn" onClick={() => actions.openModal('service', s)} title="Bearbeiten">
                            <Icon name="edit" />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => actions.toggleServiceActive(s.id)}
                            title={s.active ? 'Deaktivieren' : 'Aktivieren'}
                          >
                            <Icon name={s.active ? 'close' : 'check'} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <Empty icon="checklist" text="Noch keine Leistungen angelegt." />
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
