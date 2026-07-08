import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';
import type { Shift, ShiftStatus } from '../types';
import { isoDate } from '../utils/date';

export interface ShiftModalPayload {
  shift?: Shift;
  date?: string;
}

export function ShiftModal({ payload }: { payload?: ShiftModalPayload }) {
  const { state, actions } = useApp();
  const editing = payload?.shift ?? null;

  const [date, setDate] = useState(editing?.date ?? payload?.date ?? isoDate(new Date()));
  const [customerId, setCustomerId] = useState(editing?.customerId ?? state.customers[0]?.id ?? '');
  const [start, setStart] = useState(editing?.start ?? '09:00');
  const [end, setEnd] = useState(editing?.end ?? '13:00');
  const [pause, setPause] = useState(editing?.pause ?? 30);
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? '');
  const [status, setStatus] = useState<ShiftStatus>(editing?.status ?? 'geplant');
  const [notes, setNotes] = useState(editing?.notes ?? '');

  const activeEmployees = state.employees.filter((e) => e.status === 'aktiv');

  const save = () => {
    const data = {
      employeeId: employeeId || null,
      customerId,
      date,
      start,
      end,
      pause,
      status: !employeeId && status !== 'offen' ? ('offen' as ShiftStatus) : status,
      notes,
    };
    actions.saveShift(data, editing?.id ?? null);
    actions.closeModal();
  };

  return (
    <Modal
      title={editing ? 'Schicht bearbeiten' : 'Neue Schicht'}
      onClose={() => actions.closeModal()}
      footer={
        <>
          {editing ? (
            <button className="btn btn-danger" onClick={() => actions.deleteShift(editing.id)}>
              <Icon name="trash" /> Löschen
            </button>
          ) : null}
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="check" /> Speichern
          </button>
        </>
      }
    >
      <div className="field-row">
        <div className="field">
          <label>Datum</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Standort / Kunde</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
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
          <label>Startzeit</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>Endzeit</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Pause (Minuten)</label>
        <input type="number" min={0} step={5} value={pause} onChange={(e) => setPause(parseInt(e.target.value) || 0)} />
      </div>
      <div className="field">
        <label>Mitarbeiter</label>
        <select
          value={employeeId}
          onChange={(e) => {
            setEmployeeId(e.target.value);
            setStatus(e.target.value ? 'geplant' : 'offen');
          }}
        >
          <option value="">– Offen / noch nicht zugewiesen –</option>
          {activeEmployees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {x.role}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as ShiftStatus)}>
          <option value="geplant">Geplant</option>
          <option value="offen">Offen</option>
          <option value="bestätigt">Bestätigt</option>
          <option value="konflikt">Konflikt</option>
        </select>
      </div>
      <div className="field">
        <label>Notiz</label>
        <textarea
          rows={2}
          placeholder="z. B. Besonderheiten, Vertretung, Event…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
