import React, { useRef, useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { PhotoThumb } from './ui/PhotoThumb';
import { useApp, useCurrentUser } from '../state/AppContext';
import type { MaterialRequest, MaterialRequestItem, MaterialRequestStatus, TicketAttachmentMeta, TicketPriority } from '../types';
import { uid } from '../utils/format';
import { MAX_TICKET_ATTACHMENT_SIZE_BYTES, saveTicketAttachmentBlob } from '../utils/ticketAttachmentStore';

const CUSTOM_MATERIAL = '__custom__';
const MAX_PHOTOS = 5;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface MaterialRequestModalPayload {
  request?: MaterialRequest;
}

/** Admin/Manager: neue Materialbestellung mit mehreren Positionen selbst erstellen, oder eine bestehende
 * vollständig bearbeiten (Artikel/Menge anpassen, Objekt/Mitarbeiter ändern, Status setzen).
 * Beim NEU-Erstellen (kein editing) bewusst reduziert auf Objekt/Artikel/Notiz/Fotos — Priorität,
 * Wunschdatum, Zuständige Person und Status bleiben nur beim Bearbeiten einer bestehenden Anfrage
 * sichtbar, da sie dort zur laufenden Bearbeitung durch Admin/Manager gehören. */
export function MaterialRequestModal({ payload }: { payload?: MaterialRequestModalPayload }) {
  const { state, actions, toast } = useApp();
  const me = useCurrentUser();
  const editing = payload?.request ?? null;

  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '');
  const [locationId, setLocationId] = useState(editing?.locationId ?? state.customers[0]?.id ?? '');
  const [items, setItems] = useState<MaterialRequestItem[]>(
    editing?.items.length ? editing.items : [{ id: uid(), materialId: null, customMaterialName: null, quantity: 1 }]
  );
  const [priority, setPriority] = useState<TicketPriority>(editing?.priority ?? 'normal');
  // Bewusst leer statt heutigem Datum als Default: sonst würde jedes Speichern einer Anfrage ohne
  // Fälligkeitsdatum ihr ungewollt "heute fällig" zuweisen, nur weil das Datumsfeld im Formular initial
  // vorausgefüllt war (siehe dueRank/dueLabel in state/selectors.ts, die requestedDate für die Dashboard-
  // Farblogik nutzen).
  const [requestedDate, setRequestedDate] = useState(editing?.requestedDate ?? '');
  const [comment, setComment] = useState(editing?.comment ?? '');
  const [assigneeId, setAssigneeId] = useState(editing?.assigneeId ?? '');
  const [status, setStatus] = useState<MaterialRequestStatus>(editing?.status ?? 'offen');
  const [photos, setPhotos] = useState<TicketAttachmentMeta[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const activeEmployees = state.employees.filter((e) => e.status === 'aktiv');
  const managers = state.employees.filter((e) => e.status === 'aktiv' && (e.systemRole === 'manager' || e.systemRole === 'admin'));

  const updateItem = (id: string, patch: Partial<MaterialRequestItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const addItem = () => setItems((prev) => [...prev, { id: uid(), materialId: null, customMaterialName: null, quantity: 1 }]);
  const removeItem = (id: string) => setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const onPhotosSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    if (photos.length >= MAX_PHOTOS) {
      toast(`Maximal ${MAX_PHOTOS} Fotos pro Anfrage.`);
      return;
    }
    const room = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, room);
    if (files.length > room) toast(`Maximal ${MAX_PHOTOS} Fotos pro Anfrage.`);
    setUploadingPhotos(true);
    const added: TicketAttachmentMeta[] = [];
    for (const file of toUpload) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        toast('Nur JPG, PNG oder WEBP erlaubt.');
        continue;
      }
      if (file.size > MAX_TICKET_ATTACHMENT_SIZE_BYTES) {
        toast(`Foto zu gross (max. ${Math.round(MAX_TICKET_ATTACHMENT_SIZE_BYTES / 1024 / 1024)} MB).`);
        continue;
      }
      const id = uid();
      try {
        await saveTicketAttachmentBlob(id, file);
        added.push({
          id,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: me?.name ?? 'Unbekannt',
          storageRef: id,
        });
      } catch {
        toast('Foto konnte nicht gespeichert werden.');
      }
    }
    setPhotos((prev) => [...prev, ...added]);
    setUploadingPhotos(false);
  };

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
      // Bewusst reduziert: eine neu erstellte Anfrage braucht kein Priorität/Datum/Zuständige-Person/Status
      // aus dieser vereinfachten Erfassung heraus (siehe Kommentar an der Komponente) — Standardwerte, die
      // Admin/Manager später beim Bearbeiten jederzeit setzen können.
      actions.createMaterialRequestAdmin({
        employeeId: employeeId || null,
        assigneeId: null,
        locationId: locationId || null,
        items: cleanItems,
        comment,
        photos,
        requestedDate: null,
        status: 'offen',
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

      {editing ? (
        <>
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
              <label>Priorität</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
                <option value="niedrig">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="hoch">Hoch</option>
                <option value="dringend">Dringend</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Fälligkeitsdatum (optional)</label>
              <input type="date" value={requestedDate ?? ''} onChange={(e) => setRequestedDate(e.target.value)} />
              <div className="hint">Steuert dieselbe Fälligkeitsfarbe/-sortierung wie bei Tickets im Dashboard. Ohne Datum gilt die Anfrage als normal offen.</div>
            </div>
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
          </div>

          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as MaterialRequestStatus)}>
              <option value="offen">Offen</option>
              <option value="erledigt">Erledigt</option>
            </select>
          </div>
        </>
      ) : null}

      <div className="field">
        <label>Notiz</label>
        <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Kurze Notiz, optional" />
      </div>

      {!editing ? (
        <div className="field">
          <label>Fotos (optional)</label>
          <div className="mat-photo-row">
            {photos.map((p) => (
              <PhotoThumb key={p.id} photo={p} onRemove={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))} />
            ))}
            {photos.length < MAX_PHOTOS ? (
              <>
                <button className="mat-photo-add" onClick={() => cameraInputRef.current?.click()} disabled={uploadingPhotos} title="Foto aufnehmen">
                  <Icon name="camera" />
                </button>
                <button className="mat-photo-add" onClick={() => galleryInputRef.current?.click()} disabled={uploadingPhotos} title="Aus Galerie wählen">
                  <Icon name="upload" />
                </button>
              </>
            ) : null}
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onPhotosSelected}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={onPhotosSelected}
          />
        </div>
      ) : null}
    </Modal>
  );
}
