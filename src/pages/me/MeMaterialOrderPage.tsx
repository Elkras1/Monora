import React, { useRef, useState } from 'react';
import { useApp, useActingEmployeeId } from '../../state/AppContext';
import { eligibleCustomersFor, getEmp } from '../../state/selectors';
import { Icon } from '../../components/icons/Icon';
import { PhotoThumb } from '../../components/ui/PhotoThumb';
import type { MaterialRequestItem, TicketAttachmentMeta } from '../../types';
import { uid } from '../../utils/format';
import { MAX_TICKET_ATTACHMENT_SIZE_BYTES, saveTicketAttachmentBlob } from '../../utils/ticketAttachmentStore';

const MAX_PHOTOS = 5;
const MAX_NOTE_LENGTH = 500;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const CUSTOM_MATERIAL = '__custom__';

interface OrderLine {
  id: string;
  materialId: string; // '' = nicht gewählt, echte Artikel-ID, oder CUSTOM_MATERIAL
  customName: string;
  quantity: number;
}

function newLine(): OrderLine {
  return { id: uid(), materialId: '', customName: '', quantity: 1 };
}

/**
 * Mitarbeiter: bewusst minimale Mobile-Ansicht für Materialbestellungen — nur Objekt, Artikelzeilen
 * (Artikel + Menge) und optional Fotos. Keine Priorität, kein Datum, keine Einheit, kein Kommentar.
 */
export function MeMaterialOrderPage() {
  const { state, actions, toast } = useApp();
  const actingId = useActingEmployeeId();
  const emp = getEmp(state, actingId);
  const pool = eligibleCustomersFor(state, emp);
  const activeMaterials = state.materials.filter((m) => m.active);

  const [locationId, setLocationId] = useState(pool[0]?.id ?? '');
  const [lines, setLines] = useState<OrderLine[]>([newLine()]);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<TicketAttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const updateLine = (id: string, patch: Partial<OrderLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));
  const changeQty = (id: string, delta: number) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l)));

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    if (photos.length >= MAX_PHOTOS) {
      toast(`Maximal ${MAX_PHOTOS} Fotos pro Bestellung.`);
      return;
    }
    const room = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, room);
    if (files.length > room) toast(`Maximal ${MAX_PHOTOS} Fotos pro Bestellung.`);
    setUploading(true);
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
          uploadedBy: emp?.name ?? 'Unbekannt',
          storageRef: id,
        });
      } catch {
        toast('Foto konnte nicht gespeichert werden.');
      }
    }
    setPhotos((prev) => [...prev, ...added]);
    setUploading(false);
  };

  const validLines = lines.filter((l) => (l.materialId && l.materialId !== CUSTOM_MATERIAL) || (l.materialId === CUSTOM_MATERIAL && l.customName.trim()));

  const send = () => {
    if (!actingId || !validLines.length) return;
    const items: MaterialRequestItem[] = validLines.map((l) =>
      l.materialId === CUSTOM_MATERIAL
        ? { id: l.id, materialId: null, customMaterialName: l.customName.trim(), quantity: l.quantity }
        : { id: l.id, materialId: l.materialId, customMaterialName: null, quantity: l.quantity }
    );
    actions.createMaterialRequest({
      employeeId: actingId,
      locationId: locationId || null,
      items,
      note: note.trim() || undefined,
      photos,
    });
    toast('Bestellung gesendet.');
    setLines([newLine()]);
    setNote('');
    setPhotos([]);
  };

  return (
    <div className="mat-order-page">
      <div className="mat-section">
        <div className="mat-section-label">
          <Icon name="location" /> Objekt
        </div>
        <select className="mat-select-big" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">– Objekt wählen –</option>
          {pool.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mat-section">
        <div className="mat-section-label">
          <Icon name="box" /> Artikel
        </div>
        {lines.map((l) => (
          <div key={l.id} className="mat-line mat-line-simple">
            <select
              className="mat-line-select"
              value={l.materialId}
              onChange={(e) => updateLine(l.id, { materialId: e.target.value })}
            >
              <option value="">– Artikel wählen –</option>
              {activeMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              <option value={CUSTOM_MATERIAL}>Anderer Artikel</option>
            </select>
            {l.materialId === CUSTOM_MATERIAL ? (
              <input
                className="mat-line-custom-input"
                autoFocus
                placeholder="Artikel eingeben"
                value={l.customName}
                onChange={(e) => updateLine(l.id, { customName: e.target.value })}
              />
            ) : null}
            <div className="mat-qty-stepper">
              <button onClick={() => changeQty(l.id, -1)} disabled={l.quantity <= 1}>
                <Icon name="minus" />
              </button>
              <span className="mat-qty-value">{l.quantity}</span>
              <button onClick={() => changeQty(l.id, 1)}>
                <Icon name="plus" />
              </button>
            </div>
            <button className="mat-line-remove" onClick={() => removeLine(l.id)} disabled={lines.length <= 1}>
              <Icon name="trash" />
            </button>
          </div>
        ))}
        <button className="btn btn-outline mat-add-article-btn" onClick={addLine}>
          <Icon name="plus" /> Artikel
        </button>
      </div>

      <div className="mat-section">
        <div className="mat-section-label">Notiz optional</div>
        <textarea
          className="mat-note-input"
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          placeholder="Kurze Notiz, z. B. Lager fast leer"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="mat-section">
        <div className="mat-section-label">Fotos optional</div>
        <div className="mat-photo-row">
          {photos.map((p) => (
            <PhotoThumb key={p.id} photo={p} onRemove={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))} />
          ))}
          {photos.length < MAX_PHOTOS ? (
            <>
              <button className="mat-photo-add" onClick={() => cameraInputRef.current?.click()} disabled={uploading} title="Foto aufnehmen">
                <Icon name="camera" />
              </button>
              <button className="mat-photo-add" onClick={() => galleryInputRef.current?.click()} disabled={uploading} title="Aus Galerie wählen">
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
          onChange={onFilesSelected}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={onFilesSelected}
        />
      </div>

      <button className="mat-send-btn" onClick={send} disabled={!validLines.length || !locationId}>
        <Icon name="send" /> Bestellung senden
      </button>
    </div>
  );
}
