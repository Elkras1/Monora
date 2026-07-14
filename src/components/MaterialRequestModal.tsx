import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';
import type { MaterialRequest, MaterialRequestItem, MaterialRequestStatus, TicketPriority } from '../types';
import { uid } from '../utils/format';
import { isoDate } from '../utils/date';

const CUSTOM_MATERIAL = '__custom__';

export interface MaterialRequestModalPayload {
  request?: MaterialRequest;
}

/** Admin/Manager: neue Materialbestellung mit mehreren Positionen selbst erstellen, oder eine bestehende
 * vollständig bearbeiten (Artikel/Menge anpassen, Objekt/Mitarbeiter ändern, Status setzen). */
export function MaterialRequestModal({ payload }: { payload?: MaterialRequestModalPayload }) {
  const { state, actions } = useApp();
  const editing = payload?.request ?? null;

  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '');
  const [locationId, setLocationId] = useState(editing?.locationId ?? state.customers[0]?.id ?? '');
  const [items, setItems] = useState<MaterialRequestItem[]>(
    editing?.items.length ? editing.items : [{ id: uid(), materialId: null, customMaterialName: null, quantity: 1 }]
  );
  const [priority, setPriority] = useState<TicketPriority>(editing?.priority ?? 'normal');
  const [requestedDate, setRequestedDate] = useState(editing?.requestedDate ?? isoDate(new Date()));
  const [comment, setComment] = useState(editing?.comment ?? '');
  const [assigneeId, setAssigneeId] = useState(editing?.assigneeId ?? '');
  const [status, setStatus] = useState<MaterialRequestStatus>(editing?.status ?? 'eingereicht');

  const activeEmployees = state.employees.filter((e) => e.status === 'aktiv');
  const managers = state.employees.filter((e) => e.status === 'aktiv' && (e.systemRole === 'manager' || e.systemRole === 'admin'));

  const updateItem = (id: string, patch: Partial<MaterialRequestItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const addItem = () => setItems((prev) => [...prev, { id: uid(), materialId: null, customMaterialName: null, quantity: 1 }]);
  const removeItem = (id: string) => setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const validItems = items.filter((i) => i.materialId || (i.customMaterialName ?? '').trim());

  const save = () => {
    if (!validItems.length) return;
    const cleanItems = validItems.map((i) => ({
      ...i,
      customMaterialName: i.customMaterialName ? i.customMaterialName.trim() : null,
      quantity: Math.max(1, i.quantity),
    }));
    if (editing) {
      actions.updateMaterialRequest(editing.id, {
        employeeId: employeeId || null,
        locationId: locationId || null,
        items: cleanItems,
        priority,
        requestedDate: requestedDate || null,
        comment,
        assigneeId: assigneeId || null,
        status,
      });
    } else {
      actions.createMaterialRequestAdmin({
        employeeId: employeeId || null,
        assigneeId: assigneeId || null,
        locationId: locationId || null,
        items: cleanItems,
        priority,
        comment,
        photos: [],
        requestedDate: requestedDate || null,
        status,
      });
    }
    actions.closeModal();
  };

  return (
    <Modal
      title={editing ? 'Materialbestellung bearbeiten' : 'Neue Materialbestellung'}
      onClose={() => actions.closeModal()}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!validItems.length}>
            <Icon name="check" /> Speichern
          </button>
        </>
      }
    >
      <div className="field-row">
        <div className="field">
          <label>Mitarbeiter (optional)</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">– Kein Mitarbeiter –</option>
            {activeEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Kunde / Objekt</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">– Kein Objekt –</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Artikel</label>
        <div className="mat-modal-items">
          {items.map((item) => (
            <div key={item.id} className="mat-modal-item-row">
              <select
                value={item.materialId ? item.materialId : item.customMaterialName !== null && item.customMaterialName !== undefined ? CUSTOM_MATERIAL : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === CUSTOM_MATERIAL) updateItem(item.id, { materialId: null, customMaterialName: '' });
                  else updateItem(item.id, { materialId: v || null, customMaterialName: null });
                }}
                style={{ flex: 2 }}
              >
                <option value="">– Artikel wählen –</option>
                {state.materials
                  .filter((m) => m.active || m.id === item.materialId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                <option value={CUSTOM_MATERIAL}>Anderer Artikel</option>
              </select>
              {item.materialId === null && item.customMaterialName !== null && item.customMaterialName !== undefined && (
                <input
                  placeholder="Artikel eingeben"
                  value={item.customMaterialName}
                  onChange={(e) => updateItem(item.id, { customMaterialName: e.target.value })}
                  style={{ flex: 2 }}
                />
              )}
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                style={{ width: 70 }}
              />
              <button className="icon-btn" onClick={() => removeItem(item.id)} disabled={items.length <= 1}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={addItem}>
          <Icon name="plus" /> Artikel hinzufügen
        </button>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Priorität</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            <option value="niedrig">Niedrig</option>
            <option value="normal">Normal</option>
            <option value="hoch">Hoch</option>
            <option value="dringend">Dringend</option>
          </select>
        </div>
        <div className="field">
          <label>Gewünschtes Datum</label>
          <input type="date" value={requestedDate ?? ''} onChange={(e) => setRequestedDate(e.target.value)} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Zuständige Person</label>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">– Nicht zugewiesen –</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as MaterialRequestStatus)}>
            <option value="eingereicht">Eingereicht</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="erledigt">Erledigt</option>
            <option value="abgelehnt">Abgelehnt</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Kommentar</label>
        <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
    </Modal>
  );
}
