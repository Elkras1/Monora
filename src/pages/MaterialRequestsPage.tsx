import React, { useMemo, useState } from 'react';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { MaterialStatusBadge } from '../components/ui/Badge';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { fmtDate } from '../utils/date';
import { summarizeMaterialItems } from '../utils/format';
import { MaterialCatalogModal } from '../components/MaterialCatalogModal';

const TABS = ['alle', 'eingereicht', 'in_bearbeitung', 'erledigt', 'abgelehnt'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  alle: 'Alle',
  eingereicht: 'Eingereicht',
  in_bearbeitung: 'In Bearbeitung',
  erledigt: 'Erledigt',
  abgelehnt: 'Abgelehnt',
};

export function MaterialRequestsPage() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canManage = hasPerm('material_manage');
  const tab = state.filter.matStatus ?? 'alle';
  const [catalogOpen, setCatalogOpen] = useState(false);

  const list = useMemo(() => {
    return [...state.materialRequests]
      .filter((m) => tab === 'alle' || m.status === tab)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.materialRequests, tab]);

  const complete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Bestellung wirklich als erledigt markieren?')) {
      actions.completeMaterialRequest(id);
    }
  };

  return (
    <>
      <div className="toolbar">
        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => actions.setFilter({ matStatus: t })}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        {canManage ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => setCatalogOpen(true)}>
              <Icon name="box" /> Artikel verwalten
            </button>
            <button className="btn btn-primary" onClick={() => actions.openModal('materialRequest')}>
              <Icon name="plus" /> Neue Materialbestellung
            </button>
          </div>
        ) : null}
      </div>

      {catalogOpen ? <MaterialCatalogModal onClose={() => setCatalogOpen(false)} /> : null}

      {list.length ? (
        <>
          <div className="card tick-list-desktop">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Objekt</th>
                    <th>Artikel</th>
                    <th>Mitarbeiter</th>
                    <th>Erstellt</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((m) => {
                    const emp = getEmp(state, m.employeeId);
                    const cust = getCust(state, m.locationId);
                    return (
                      <tr key={m.id} onClick={() => actions.openMaterialRequestPanel(m.id)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 700 }}>{cust ? cust.name : '–'}</td>
                        <td style={{ maxWidth: 260 }}>
                          {summarizeMaterialItems(m.items, state.materials)}
                          {m.note ? (
                            <span title="Notiz vorhanden" style={{ marginLeft: 6 }}>
                              <Icon name="edit" />
                            </span>
                          ) : null}
                          {m.photos.length ? (
                            <span title={`${m.photos.length} Foto(s)`} style={{ marginLeft: 6 }}>
                              <Icon name="camera" />
                            </span>
                          ) : null}
                        </td>
                        <td>{emp ? emp.name : '–'}</td>
                        <td className="mono">{fmtDate(new Date(m.createdAt))}</td>
                        <td>
                          <MaterialStatusBadge status={m.status} />
                        </td>
                        <td>
                          {canManage && m.status !== 'erledigt' && m.status !== 'abgelehnt' ? (
                            <button className="btn btn-accent btn-sm" onClick={(e) => complete(e, m.id)}>
                              <Icon name="check" /> Erledigt
                            </button>
                          ) : m.linkedTicketId ? (
                            <Icon name="ticket" />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tick-list-mobile">
            {list.map((m) => {
              const emp = getEmp(state, m.employeeId);
              const cust = getCust(state, m.locationId);
              return (
                <div key={m.id} className="eval-card mat-req-card" onClick={() => actions.openMaterialRequestPanel(m.id)}>
                  <div className="mat-req-card-object">{cust ? cust.name : 'Kein Objekt'}</div>
                  {cust?.address ? <div className="hint">{cust.address}</div> : null}
                  <div className="mat-req-card-items">{summarizeMaterialItems(m.items, state.materials, 70)}</div>
                  <div className="mat-req-card-meta">
                    <span className="hint">{emp ? emp.name : 'Kein Mitarbeiter'}</span>
                    {m.photos.length ? (
                      <span className="mat-req-photo-indicator">
                        <Icon name="camera" /> {m.photos.length}
                      </span>
                    ) : null}
                  </div>
                  {m.note ? <div className="mat-panel-note">„{m.note}“</div> : null}
                  <div className="eval-card-foot">
                    <MaterialStatusBadge status={m.status} />
                    {canManage && m.status !== 'erledigt' && m.status !== 'abgelehnt' ? (
                      <button className="btn btn-accent btn-sm" onClick={(e) => complete(e, m.id)}>
                        <Icon name="check" /> Erledigt
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Empty icon="box" text="Keine Materialbestellungen in dieser Ansicht." />
      )}
    </>
  );
}
