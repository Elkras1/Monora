import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';
import type { CalendarEvent } from '../types';

const COLOR_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'Planico-Blau' },
  { value: 'var(--green)', label: 'Grün' },
  { value: 'var(--orange)', label: 'Orange' },
  { value: 'var(--red)', label: 'Rot' },
  { value: 'var(--amber)', label: 'Gelb' },
];

/**
 * Manueller Dashboard-Kalendertermin — erstellen, bearbeiten, löschen. Bewusst als eigenständiges,
 * lokal verwaltetes Overlay (wie TicketsOverviewModal/MaterialRequestsOverviewModal), nicht über das
 * globale state.modal-System, da es nur vom Dashboard-Kalender aus geöffnet wird (siehe DashboardCalendar.tsx).
 * Tickets werden hier bewusst NICHT verwaltet — deren Termin kommt direkt aus state.tickets (dueDate).
 */
export function CalendarEventModal({
  event,
  defaultDate,
  onClose,
}: {
  event?: CalendarEvent;
  defaultDate: string;
  onClose: () => void;
}) {
  const { state, actions } = useApp();
  const editing = event ?? null;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [date, setDate] = useState(editing?.date ?? defaultDate);
  const [startTime, setStartTime] = useState(editing?.startTime ?? '');
  const [endTime, setEndTime] = useState(editing?.endTime ?? '');
  const [locationId, setLocationId] = useState(editing?.locationId ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [color, setColor] = useState<string | null>(editing?.color ?? null);

  const canSave = title.trim() && date;

  const save = () => {
    if (!canSave) return;
    const data = {
      title: title.trim(),
      date,
      startTime: startTime || null,
      endTime: endTime || null,
      locationId: locationId || null,
      note: note.trim() || null,
      color,
    };
    if (editing) {
      actions.updateCalendarEvent(editing.id, data);
    } else {
      actions.createCalendarEvent(data);
    }
    onClose();
  };

  const remove = () => {
    if (!editing) return;
    if (window.confirm('Diesen Termin wirklich löschen?')) {
      actions.deleteCalendarEvent(editing.id);
      onClose();
    }
  };

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h3>{editing ? 'Termin bearbeiten' : 'Neuer Kalendereintrag'}</h3>
          <button className="close-x" onClick={onClose} aria-label="Schliessen">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Titel</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Handwerker – Türe öffnen" autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Datum</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Objekt / Standort (optional)</label>
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
          <div className="field-row">
            <div className="field">
              <label>Uhrzeit von (optional)</label>
              <input type="time" value={startTime ?? ''} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="field">
              <label>Uhrzeit bis (optional)</label>
              <input type="time" value={endTime ?? ''} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Notiz (optional)</label>
            <textarea rows={2} value={note ?? ''} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="field">
            <label>Farbe</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  title={opt.label}
                  onClick={() => setColor(opt.value)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: color === opt.value ? '2px solid var(--ink)' : '1px solid var(--line)',
                    background: opt.value ?? 'var(--primary)',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          {editing ? (
            <button className="btn btn-danger" onClick={remove}>
              <Icon name="trash" /> Löschen
            </button>
          ) : null}
          <button className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!canSave}>
            <Icon name="check" /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
