import React, { useState } from 'react';
import { Drawer } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { MaterialStatusBadge } from './ui/Badge';
import { PhotoThumb } from './ui/PhotoThumb';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { colorFor, initials, materialItemName } from '../utils/format';
import { fmtDate } from '../utils/date';

/** Admin/Manager: Materialbestellung als EIN zusammenhängender Vorgang (alle Positionen zusammen, nicht
 * je Artikel ein Ticket) — mit der wichtigsten Schnellaktion "Als erledigt markieren" in einem Klick. */
export function MaterialRequestPanel() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canManage = hasPerm('material_manage');
  const req = state.materialRequests.find((m) => m.id === state.panelMaterialRequestId);

  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [dueDate, setDueDate] = useState(req?.requestedDate ?? '');

  if (!req) return null;
  const emp = getEmp(state, req.employeeId);
  const cust = getCust(state, req.locationId);
  const createdBy = getEmp(state, req.createdByEmployeeId);
  const completedByEmp = getEmp(state, req.completedBy);
  const linkedTicket = req.linkedTicketId ? state.tickets.find((t) => t.id === req.linkedTicketId) : undefined;
  const isOpen = req.status !== 'erledigt' && req.status !== 'abgelehnt';

  const complete = () => {
    if (window.confirm('Bestellung wirklich als erledigt markieren?')) {
      actions.completeMaterialRequest(req.id);
    }
  };

  const convert = () => {
    actions.convertMaterialRequestToTicket(req.id, {
      assignedEmployeeId: assignedEmployeeId || null,
      assignedManagerId: assignedManagerId || null,
      dueDate: dueDate || null,
    });
    actions.closeMaterialRequestPanel();
  };

  return (
    <Drawer
      title="Materialbestellung"
      onClose={() => actions.closeMaterialRequestPanel()}
      footer={
        canManage ? (
          <>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm('Diese Materialbestellung wirklich löschen?')) {
                  actions.deleteMaterialRequest(req.id);
                  actions.closeMaterialRequestPanel();
                }
              }}
            >
              <Icon name="trash" />
            </button>
            {isOpen ? (
              <button className="btn btn-outline" onClick={() => actions.setMaterialRequestStatus(req.id, 'abgelehnt')}>
                <Icon name="close" /> Ablehnen
              </button>
            ) : null}
            {req.status === 'eingereicht' ? (
              <button className="btn btn-outline" onClick={() => actions.setMaterialRequestStatus(req.id, 'in_bearbeitung')}>
                In Bearbeitung
              </button>
            ) : null}
            <button
              className="btn btn-primary"
              onClick={() => {
                actions.closeMaterialRequestPanel();
                actions.openModal('materialRequest', { request: req });
              }}
            >
              <Icon name="edit" /> Bearbeiten
            </button>
            {isOpen ? (
              <button className="btn btn-accent mat-complete-btn" onClick={complete}>
                <Icon name="check" /> Als erledigt markieren
              </button>
            ) : null}
          </>
        ) : null
      }
    >
      <div className="mat-panel-object" style={{ marginBottom: 16 }}>
        <Icon name="location" />
        <h2>{cust ? cust.name : 'Kein Objekt angegeben'}</h2>
      </div>

      <div className="settings-section">
        <h3 style={{ fontSize: 13 }}>Artikel</h3>
        <div className="mat-panel-items">
          {req.items.map((i) => (
            <div key={i.id} className="mat-panel-item-row">
              <span className="qty">{i.quantity}×</span>
              <span className="name">{materialItemName(i, state.materials)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mat-panel-employee" style={{ marginTop: 14 }}>
        <div className="avatar" style={{ background: emp ? colorFor(emp.id) : 'var(--ink-faint)', width: 30, height: 30, fontSize: 12 }}>
          {emp ? initials(emp.name) : '?'}
        </div>
        <span className="hint">Bestellt von: {emp ? emp.name : 'Kein Mitarbeiter'}</span>
      </div>

      {req.note ? (
        <div className="settings-section" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13 }}>Notiz</h3>
          <div className="mat-panel-note">„{req.note}“</div>
        </div>
      ) : null}

      {req.photos.length ? (
        <div className="settings-section" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13 }}>Fotos</h3>
          <div className="mat-photo-row mat-photo-row-lg" style={{ marginTop: 8 }}>
            {req.photos.map((p) => (
              <PhotoThumb key={p.id} photo={p} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="detail-grid" style={{ marginTop: 16 }}>
        <div>
          <span className="dl">Erstellt von</span>
          <span className="dv">{createdBy ? createdBy.name : '–'}</span>
        </div>
        <div>
          <span className="dl">Eingereicht</span>
          <span className="dv">{fmtDate(new Date(req.createdAt))}</span>
        </div>
        {req.status === 'erledigt' ? (
          <div style={{ gridColumn: '1/-1' }}>
            <span className="dl">Erledigt</span>
            <span className="dv">
              {req.completedAt ? fmtDate(new Date(req.completedAt)) : ''} {completedByEmp ? `· ${completedByEmp.name}` : req.completedBy ? `· ${req.completedBy}` : ''}
            </span>
          </div>
        ) : null}
        {req.comment ? (
          <div style={{ gridColumn: '1/-1' }}>
            <span className="dl">Kommentar</span>
            <span className="dv">{req.comment}</span>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <MaterialStatusBadge status={req.status} />
      </div>

      {linkedTicket ? (
        <div className="ok-box" style={{ marginTop: 16 }}>
          <Icon name="ticket" /> Verknüpft mit Ticket <b>{linkedTicket.ticketNumber}</b>
        </div>
      ) : null}

      {canManage && !req.linkedTicketId ? (
        <div className="settings-section" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 13 }}>Für Ticket-Umwandlung: zuständige Person &amp; Fälligkeit</h3>
          <div className="field-row" style={{ marginTop: 8 }}>
            <div className="field">
              <label>Zuständiger Mitarbeiter</label>
              <select value={assignedEmployeeId} onChange={(e) => setAssignedEmployeeId(e.target.value)}>
                <option value="">– Anfragender ({emp?.name ?? '–'}) –</option>
                {state.employees
                  .filter((e) => e.status === 'aktiv')
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>Zuständiger Manager</label>
              <select value={assignedManagerId} onChange={(e) => setAssignedManagerId(e.target.value)}>
                <option value="">– Nicht zugewiesen –</option>
                {state.employees
                  .filter((e) => e.status === 'aktiv' && (e.systemRole === 'manager' || e.systemRole === 'admin'))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={convert}>
            <Icon name="ticket" /> Als Ticket übernehmen
          </button>
        </div>
      ) : null}

    </Drawer>
  );
}
