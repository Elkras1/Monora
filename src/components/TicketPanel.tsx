import React, { useState } from 'react';
import { Drawer } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { TicketPriorityBadge, TicketStatusBadge } from './ui/Badge';
import { useApp, useCurrentUser, useHasPerm, useIsAdmin } from '../state/AppContext';
import { getCust, getEmp } from '../state/selectors';
import type { TicketAttachmentMeta, TicketStatus } from '../types';
import { summarizeMaterialItems, uid } from '../utils/format';
import { fmtDate } from '../utils/date';
import { isAllowedTicketAttachment, MAX_TICKET_ATTACHMENT_SIZE_BYTES, saveTicketAttachmentBlob } from '../utils/ticketAttachmentStore';

export function TicketPanel() {
  const { state, actions, toast } = useApp();
  const hasPerm = useHasPerm();
  const isAdmin = useIsAdmin();
  const me = useCurrentUser();
  const [commentText, setCommentText] = useState('');
  const [uploading, setUploading] = useState(false);

  const ticket = state.tickets.find((t) => t.id === state.panelTicketId);
  if (!ticket) return null;

  const cust = getCust(state, ticket.customerId);
  const assignedEmp = getEmp(state, ticket.assignedEmployeeId);
  const assignedMgr = getEmp(state, ticket.assignedManagerId);
  const linkedRequest = ticket.materialRequestId ? state.materialRequests.find((m) => m.id === ticket.materialRequestId) : undefined;

  const isAssignedToMe = !!me && ticket.assignedEmployeeId === me.id;
  const canFullEdit = hasPerm('tickets_edit');
  const canAssign = hasPerm('tickets_assign');
  const canComment = canFullEdit || isAssignedToMe;
  const canQuickStatus = hasPerm('tickets_status_update') && isAssignedToMe;
  const canDelete = isAdmin;

  const submitComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    actions.addTicketComment(ticket.id, trimmed);
    setCommentText('');
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAllowedTicketAttachment(file)) {
      toast('Dieser Dateityp ist nicht erlaubt. Erlaubt: Bilder, PDF und Office-Dokumente.');
      return;
    }
    if (file.size > MAX_TICKET_ATTACHMENT_SIZE_BYTES) {
      toast(`Datei zu gross (max. ${Math.round(MAX_TICKET_ATTACHMENT_SIZE_BYTES / 1024 / 1024)} MB im Prototyp).`);
      return;
    }
    const id = uid();
    setUploading(true);
    try {
      await saveTicketAttachmentBlob(id, file);
      const meta: TicketAttachmentMeta = {
        id,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: me?.name ?? 'Unbekannt',
        storageRef: id,
      };
      actions.addTicketAttachment(ticket.id, meta);
    } catch {
      toast('Datei konnte nicht angehängt werden.');
    } finally {
      setUploading(false);
    }
  };

  const setStatus = (status: TicketStatus) => actions.setTicketStatus(ticket.id, status);

  return (
    <Drawer
      title={`${ticket.ticketNumber} · ${ticket.type === 'material' ? 'Materialticket' : 'Aufgabe'}`}
      onClose={() => actions.closeTicketPanel()}
      footer={
        <>
          {canDelete ? (
            <button
              className="btn btn-danger"
              onClick={() => {
                actions.deleteTicket(ticket.id);
                actions.closeTicketPanel();
              }}
            >
              <Icon name="trash" /> Löschen
            </button>
          ) : null}
          {canFullEdit ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                actions.closeTicketPanel();
                actions.openModal('ticket', { ticket });
              }}
            >
              <Icon name="edit" /> Bearbeiten
            </button>
          ) : null}
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <TicketStatusBadge status={ticket.status} />
        <TicketPriorityBadge priority={ticket.priority} />
      </div>
      <h3 style={{ fontSize: 16.5, marginBottom: 6 }}>{ticket.title}</h3>
      {ticket.description ? <div className="hint" style={{ marginBottom: 16 }}>{ticket.description}</div> : null}

      <div className="detail-grid">
        <div>
          <span className="dl">Kunde / Objekt</span>
          <span className="dv">{cust ? cust.name : '–'}</span>
        </div>
        <div>
          <span className="dl">Kategorie</span>
          <span className="dv">{ticket.category ?? '–'}</span>
        </div>
        <div>
          <span className="dl">Zuständiger Mitarbeiter</span>
          <span className="dv">{assignedEmp ? assignedEmp.name : '–'}</span>
        </div>
        <div>
          <span className="dl">Zuständiger Manager</span>
          <span className="dv">{assignedMgr ? assignedMgr.name : '–'}</span>
        </div>
        <div>
          <span className="dl">Startdatum</span>
          <span className="dv">{ticket.startDate ? fmtDate(new Date(ticket.startDate)) : '–'}</span>
        </div>
        <div>
          <span className="dl">Fällig</span>
          <span className="dv">
            {ticket.dueDate ? fmtDate(new Date(ticket.dueDate)) : '–'}
            {ticket.dueTime ? ` · ${ticket.dueTime}` : ''}
          </span>
        </div>
        {ticket.note ? (
          <div style={{ gridColumn: '1/-1' }}>
            <span className="dl">Interne Notiz</span>
            <span className="dv">{ticket.note}</span>
          </div>
        ) : null}
        {linkedRequest ? (
          <div style={{ gridColumn: '1/-1' }}>
            <span className="dl">Verknüpfte Materialanfrage</span>
            <span className="dv">{summarizeMaterialItems(linkedRequest.items, state.materials)}</span>
          </div>
        ) : null}
      </div>

      {canAssign ? (
        <div className="settings-section" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 13 }}>Zuweisung ändern</h3>
          <div className="field-row" style={{ marginTop: 8 }}>
            <div className="field">
              <label>Mitarbeiter</label>
              <select
                value={ticket.assignedEmployeeId ?? ''}
                onChange={(e) => actions.assignTicket(ticket.id, e.target.value || null, ticket.assignedManagerId)}
              >
                <option value="">– Nicht zugewiesen –</option>
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
              <label>Manager</label>
              <select
                value={ticket.assignedManagerId ?? ''}
                onChange={(e) => actions.assignTicket(ticket.id, ticket.assignedEmployeeId, e.target.value || null)}
              >
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
        </div>
      ) : null}

      {canFullEdit ? (
        <div className="settings-section" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 13 }}>Status ändern</h3>
          <select value={ticket.status} onChange={(e) => setStatus(e.target.value as TicketStatus)} style={{ marginTop: 8 }}>
            <option value="neu">Neu</option>
            <option value="geplant">Geplant</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="wartet_rueckmeldung">Wartet auf Rückmeldung</option>
            <option value="erledigt">Erledigt</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>
        </div>
      ) : canQuickStatus ? (
        <div className="settings-section" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 13 }}>Status ändern</h3>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setStatus('in_bearbeitung')} disabled={ticket.status === 'in_bearbeitung'}>
              In Bearbeitung
            </button>
            <button className="btn btn-accent btn-sm" onClick={() => setStatus('erledigt')} disabled={ticket.status === 'erledigt'}>
              <Icon name="check" /> Erledigt
            </button>
          </div>
        </div>
      ) : null}

      <div className="settings-section" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 13 }}>Anhänge</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {ticket.attachments.length ? (
            ticket.attachments.map((a) => (
              <div key={a.id} className="chat-file-card" style={{ marginBottom: 0 }}>
                <Icon name="fileText" />
                <div className="chat-file-card-info">
                  <div className="name">{a.fileName}</div>
                  <div className="size">{Math.round(a.size / 1024)} KB</div>
                </div>
              </div>
            ))
          ) : (
            <div className="hint">Keine Anhänge vorhanden.</div>
          )}
          {canComment ? (
            <label className="btn btn-outline btn-sm" style={{ width: 'fit-content', cursor: 'pointer' }}>
              <Icon name="upload" /> {uploading ? 'Wird hochgeladen …' : 'Datei anhängen'}
              <input type="file" style={{ display: 'none' }} onChange={onFileSelected} disabled={uploading} />
            </label>
          ) : null}
        </div>
      </div>

      <div className="settings-section" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 13 }}>Kommentare</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {ticket.comments.length ? (
            ticket.comments.map((c) => (
              <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{c.authorName}</span>
                  <span className="hint">{fmtDate(new Date(c.createdAt))}</span>
                </div>
                <div style={{ fontSize: 13 }}>{c.text}</div>
              </div>
            ))
          ) : (
            <div className="hint">Noch keine Kommentare.</div>
          )}
          {canComment ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <textarea
                rows={2}
                placeholder="Kommentar hinzufügen …"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary btn-sm" onClick={submitComment} disabled={!commentText.trim()}>
                <Icon name="send" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="settings-section" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 13 }}>Aktivitätsverlauf</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {[...ticket.activityLog].reverse().map((entry) => (
            <div key={entry.id} style={{ fontSize: 12, color: 'var(--ink-soft)', borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{entry.text}</span> · {entry.by} ·{' '}
              {new Date(entry.ts).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
