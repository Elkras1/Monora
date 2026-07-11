import React, { useState } from 'react';
import { Drawer } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { StatusBadge } from './ui/Badge';
import { useApp, useHasPerm } from '../state/AppContext';
import { getCust, getEmp, getService } from '../state/selectors';
import { fmtDate, fmtTime, pad } from '../utils/date';
import { colorFor, initials } from '../utils/format';
import type { TimeEntryStatus } from '../types';

export function TimeEntryPanel() {
  const { state, actions } = useApp();
  const hasPerm = useHasPerm();
  const entry = state.timeEntries.find((t) => t.id === state.panelTimeEntryId);
  const canEdit = hasPerm('time_edit') || hasPerm('time_correct');

  const inD = entry ? new Date(entry.clockIn) : null;
  const outD = entry?.clockOut ? new Date(entry.clockOut) : null;

  const [start, setStart] = useState(inD ? `${pad(inD.getHours())}:${pad(inD.getMinutes())}` : '');
  const [end, setEnd] = useState(outD ? `${pad(outD.getHours())}:${pad(outD.getMinutes())}` : '');
  const [pauseMinutes, setPauseMinutes] = useState(entry?.pauseMinutes ?? 0);
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [status, setStatus] = useState<TimeEntryStatus>(entry?.status ?? 'offen');
  const [serviceId, setServiceId] = useState(entry?.serviceId ?? '');

  if (!entry || !inD) return null;
  const e = getEmp(state, entry.employeeId);
  const c = getCust(state, entry.customerId);
  const svc = getService(state, entry.serviceId);
  const serviceOptions = state.services.filter((sv) => sv.active || sv.id === entry.serviceId);
  const log = [...entry.changeLog].reverse();

  const save = () => {
    actions.saveTimeEntryDetail(entry.id, { start, end, pauseMinutes, notes, status, serviceId: serviceId || null });
  };

  return (
    <Drawer
      title="Zeiteintrag"
      onClose={() => actions.closeTimeEntryPanel()}
      footer={
        canEdit ? (
          <button className="btn btn-primary" onClick={save}>
            <Icon name="check" /> Änderungen speichern
          </button>
        ) : null
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          className="avatar"
          style={{ background: e ? colorFor(e.id) : 'var(--ink-faint)', width: 40, height: 40, fontSize: 14 }}
        >
          {e ? initials(e.name) : '?'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{e?.name ?? '–'}</div>
          <div className="hint">
            {e?.role} · {c ? c.name : '–'}
          </div>
        </div>
      </div>
      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <div>
          <span className="dl">Datum</span>
          <span className="dv">{fmtDate(inD)}</span>
        </div>
        <div>
          <span className="dl">Status</span>
          <span className="dv">
            <StatusBadge status={entry.status} />
          </span>
        </div>
        <div>
          <span className="dl">Leistung</span>
          <span className="dv">{svc ? svc.name : 'Keine Leistung zugewiesen'}</span>
        </div>
        <div>
          <span className="dl">Erstellt am</span>
          <span className="dv">
            {fmtDate(new Date(entry.createdAt))} {fmtTime(new Date(entry.createdAt))}
          </span>
        </div>
        <div>
          <span className="dl">Letzte Änderung</span>
          <span className="dv">
            {fmtDate(new Date(entry.updatedAt))} {fmtTime(new Date(entry.updatedAt))}
          </span>
        </div>
      </div>
      <div className="settings-section" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13 }}>GPS &amp; Geofencing</h3>
        <div className="detail-grid" style={{ marginTop: 8 }}>
          <div>
            <span className="dl">Geofence-Radius</span>
            <span className="dv">{entry.geofenceRadius} m</span>
          </div>
          <div>
            <span className="dl">Check-in Geofence</span>
            <span className="dv">
              {entry.geofenceOk ? (
                <span className="badge badge-mint">
                  <span className="badge-dot" />
                  Innerhalb Radius
                </span>
              ) : (
                <span className="badge badge-red">
                  <span className="badge-dot" />
                  Außerhalb Radius
                </span>
              )}
            </span>
          </div>
          <div>
            <span className="dl">Check-in Koordinaten</span>
            <span className="dv mono">
              {entry.checkInLat.toFixed(5)}, {entry.checkInLng.toFixed(5)}
            </span>
          </div>
          <div>
            <span className="dl">Check-in Genauigkeit / Entfernung</span>
            <span className="dv">
              ±{Math.round(entry.checkInAccuracy)} m · {Math.round(entry.checkInDistance)} m vom Objekt
            </span>
          </div>
          <div>
            <span className="dl">Check-out Koordinaten</span>
            <span className="dv mono">
              {entry.checkOutLat !== null && entry.checkOutLng !== null
                ? `${entry.checkOutLat.toFixed(5)}, ${entry.checkOutLng.toFixed(5)}`
                : '–'}
            </span>
          </div>
          <div>
            <span className="dl">Check-out Genauigkeit / Entfernung</span>
            <span className="dv">
              {entry.checkOutAccuracy !== null && entry.checkOutDistance !== null
                ? `±${Math.round(entry.checkOutAccuracy)} m · ${Math.round(entry.checkOutDistance)} m vom Objekt`
                : '–'}
            </span>
          </div>
        </div>
      </div>
      {canEdit ? (
        <>
          <div className="field-row">
            <div className="field">
              <label>Startzeit</label>
              <input type="time" value={start} onChange={(ev) => setStart(ev.target.value)} />
            </div>
            <div className="field">
              <label>Endzeit</label>
              <input type="time" value={end} onChange={(ev) => setEnd(ev.target.value)} />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Pause (Minuten)</label>
            <input type="number" min={0} value={pauseMinutes} onChange={(ev) => setPauseMinutes(parseInt(ev.target.value) || 0)} />
          </div>
          <div className="field">
            <label>Notiz</label>
            <textarea rows={2} placeholder="Notiz ergänzen…" value={notes} onChange={(ev) => setNotes(ev.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(ev) => setStatus(ev.target.value as TimeEntryStatus)}>
              <option value="offen">Offen</option>
              <option value="bestätigt">Bestätigt</option>
              <option value="korrigiert">Korrigiert</option>
            </select>
          </div>
          <div className="field">
            <label>Leistung</label>
            <select value={serviceId} onChange={(ev) => setServiceId(ev.target.value)}>
              <option value="">– Keine Leistung –</option>
              {serviceOptions.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.name}
                  {!sv.active ? ' (inaktiv)' : ''}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div className="hint" style={{ marginBottom: 14 }}>
          Nur Ansicht – keine Bearbeitungsrechte für Zeiteinträge.
        </div>
      )}
      <div className="settings-section" style={{ marginTop: 6 }}>
        <h3 style={{ fontSize: 13 }}>Änderungsprotokoll</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>
          {log.length ? (
            log.map((l, i) => (
              <div key={i} style={{ borderLeft: '2px solid var(--line)', paddingLeft: 10 }}>
                <div style={{ fontSize: 12.5 }}>{l.text}</div>
                <div className="hint">
                  {fmtDate(new Date(l.ts))} {fmtTime(new Date(l.ts))} · {l.by}
                </div>
              </div>
            ))
          ) : (
            <div className="hint">Noch keine Änderungen protokolliert.</div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
