import React, { useEffect, useState } from 'react';
import { Icon } from './icons/Icon';
import { MaterialStatusBadge } from './ui/Badge';
import { PhotoThumb } from './ui/PhotoThumb';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import { colorFor, initials, materialItemName } from '../utils/format';
import { fmtDate, fmtTime } from '../utils/date';
import { getTicketAttachmentBlob } from '../utils/ticketAttachmentStore';
import type { TicketAttachmentMeta } from '../types';

const MAX_PHOTOS_SHOWN = 4;

/** Vergrösserte Bildansicht beim Klick auf ein Foto-Vorschaubild — lädt den Blob unabhängig von
 * PhotoThumb noch einmal aus IndexedDB, da PhotoThumb seine geladene Objekt-URL nicht nach aussen gibt. */
function PhotoLightbox({ photo, onClose }: { photo: TicketAttachmentMeta; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objUrl: string | null = null;
    getTicketAttachmentBlob(photo.storageRef).then((blob) => {
      if (!active || !blob) return;
      objUrl = URL.createObjectURL(blob);
      setUrl(objUrl);
    });
    return () => {
      active = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [photo.storageRef]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-top">
        <button className="icon-btn" onClick={onClose} title="Schliessen">
          <Icon name="close" />
        </button>
      </div>
      {url ? <img src={url} alt={photo.fileName} onClick={(e) => e.stopPropagation()} /> : null}
    </div>
  );
}

/** Admin/Manager: Materialbestellung als EIN zusammenhängender Vorgang (alle Positionen zusammen, nicht
 * je Artikel ein Ticket) — als zentriertes Modal (kein rechtes Side-Panel mehr). Objekt, Artikel, Status
 * und die Hauptaktionen sind sofort sichtbar; alles Weitere steckt hinter „Mehr Infos" (eingeklappt). */
export function MaterialRequestPanel() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const canManage = hasPerm('material_manage');
  const req = state.materialRequests.find((m) => m.id === state.panelMaterialRequestId);

  const [moreOpen, setMoreOpen] = useState(false);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<TicketAttachmentMeta | null>(null);

  const close = () => actions.closeMaterialRequestPanel();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightboxPhoto) setLightboxPhoto(null);
      else close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxPhoto]);

  if (!req) return null;

  const emp = getEmp(state, req.employeeId);
  const cust = getCust(state, req.locationId);
  const createdBy = getEmp(state, req.createdByEmployeeId);
  const assignee = getEmp(state, req.assigneeId);
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
    close();
  };

  const shownPhotos = photosExpanded ? req.photos : req.photos.slice(0, MAX_PHOTOS_SHOWN);
  const hiddenPhotoCount = req.photos.length - shownPhotos.length;

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal mat-request-modal">
        <div className="modal-head">
          <h3>Materialbestellung</h3>
          <button className="close-x" onClick={close} aria-label="Schliessen">
            <Icon name="close" />
          </button>
        </div>

        <div className="mat-request-body">
          <div className="mat-panel-object">
            <Icon name="location" />
            <h2>{cust ? cust.name : 'Kein Objekt angegeben'}</h2>
          </div>
          {cust?.address ? <div className="hint mat-panel-address">{cust.address}</div> : null}

          <div className="mat-panel-items" style={{ marginTop: 18 }}>
            {req.items.map((i) => (
              <div key={i.id} className="mat-panel-item-row">
                <span className="name">{materialItemName(i, state.materials)}</span>
                <span className="qty">× {i.quantity}</span>
              </div>
            ))}
          </div>

          {req.photos.length ? (
            <div className="mat-photo-row mat-photo-row-lg" style={{ marginTop: 14 }}>
              {shownPhotos.map((p) => (
                <PhotoThumb key={p.id} photo={p} onClick={() => setLightboxPhoto(p)} />
              ))}
              {hiddenPhotoCount > 0 ? (
                <button className="mat-photo-more" onClick={() => setPhotosExpanded(true)}>
                  +{hiddenPhotoCount} weitere
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mat-request-status-row">
            <MaterialStatusBadge status={req.status} />
            {canManage && req.status === 'eingereicht' ? (
              <button className="link-btn" onClick={() => actions.setMaterialRequestStatus(req.id, 'in_bearbeitung')}>
                In Bearbeitung setzen
              </button>
            ) : null}
          </div>

          {linkedTicket ? (
            <div className="ok-box" style={{ marginTop: 4, marginBottom: 14 }}>
              <Icon name="ticket" /> Verknüpft mit Ticket <b>{linkedTicket.ticketNumber}</b>
            </div>
          ) : null}

          {canManage ? (
            <div className="mat-request-actions">
              {isOpen ? (
                <button className="btn btn-accent mat-complete-btn" onClick={complete}>
                  <Icon name="check" /> Erledigt
                </button>
              ) : null}
              <button
                className="btn btn-outline"
                onClick={() => {
                  close();
                  actions.openModal('materialRequest', { request: req });
                }}
              >
                <Icon name="edit" /> Bearbeiten
              </button>
              {isOpen ? (
                <button className="btn btn-outline" onClick={() => actions.setMaterialRequestStatus(req.id, 'abgelehnt')}>
                  <Icon name="close" /> Ablehnen
                </button>
              ) : null}
              {!req.linkedTicketId ? (
                <button className="btn btn-outline" onClick={convert}>
                  <Icon name="ticket" /> Als Ticket übernehmen
                </button>
              ) : null}
            </div>
          ) : null}

          <button className="dash-more-toggle" style={{ marginTop: 18 }} onClick={() => setMoreOpen((v) => !v)}>
            <span>Mehr Infos</span>
            <Icon name={moreOpen ? 'chevUp' : 'chevDown'} />
          </button>

          {moreOpen ? (
            <div className="mat-more-panel">
              <div className="detail-grid">
                <div>
                  <span className="dl">Bestellt von</span>
                  <span className="dv">
                    {emp ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="avatar" style={{ background: colorFor(emp.id), width: 20, height: 20, fontSize: 9 }}>
                          {initials(emp.name)}
                        </span>
                        {emp.name}
                      </span>
                    ) : (
                      'Kein Mitarbeiter'
                    )}
                  </span>
                </div>
                {emp?.email ? (
                  <div>
                    <span className="dl">E-Mail</span>
                    <span className="dv">{emp.email}</span>
                  </div>
                ) : null}
                <div>
                  <span className="dl">Erstellt am</span>
                  <span className="dv">
                    {fmtDate(new Date(req.createdAt))} · {fmtTime(new Date(req.createdAt))}
                  </span>
                </div>
                <div>
                  <span className="dl">Erstellt von</span>
                  <span className="dv">{createdBy ? createdBy.name : '–'}</span>
                </div>
                {assignee ? (
                  <div>
                    <span className="dl">Bearbeitet von</span>
                    <span className="dv">{assignee.name}</span>
                  </div>
                ) : null}
                {req.status === 'erledigt' ? (
                  <div style={{ gridColumn: '1/-1' }}>
                    <span className="dl">Erledigt am</span>
                    <span className="dv">
                      {req.completedAt ? `${fmtDate(new Date(req.completedAt))} · ${fmtTime(new Date(req.completedAt))}` : ''}{' '}
                      {completedByEmp ? `· ${completedByEmp.name}` : req.completedBy ? `· ${req.completedBy}` : ''}
                    </span>
                  </div>
                ) : null}
              </div>

              {req.note ? (
                <div className="settings-section" style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 13 }}>Notiz</h3>
                  <div className="mat-panel-note">„{req.note}“</div>
                </div>
              ) : null}

              {req.comment ? (
                <div className="settings-section" style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 13 }}>Interner Kommentar</h3>
                  <div className="mat-panel-note">{req.comment}</div>
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
                  <div className="field" style={{ maxWidth: 220, marginBottom: 0 }}>
                    <label>Fälligkeit (optional)</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
              ) : null}

              {canManage ? (
                <button
                  className="btn btn-danger btn-sm"
                  style={{ marginTop: 18 }}
                  onClick={() => {
                    if (window.confirm('Diese Materialbestellung wirklich löschen?')) {
                      actions.deleteMaterialRequest(req.id);
                      close();
                    }
                  }}
                >
                  <Icon name="trash" /> Materialbestellung löschen
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {lightboxPhoto ? <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} /> : null}
    </div>
  );
}
