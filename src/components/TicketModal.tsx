import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from '../types';
import { isoDate } from '../utils/date';

const CATEGORIES: TicketCategory[] = [
  'Reinigung nachbessern',
  'Qualitätskontrolle',
  'Kundenanfrage',
  'Reparatur / Schaden',
  'Sonderreinigung',
  'Fensterreinigung',
  'Rasenpflege',
  'Sonstiges',
];

export interface TicketModalPayload {
  ticket?: Ticket;
  customerId?: string;
  date?: string;
  employeeId?: string;
}

/** Erstellt/bearbeitet ausschliesslich Aufgaben-/Kundentickets (type "aufgabe"). Materialtickets entstehen
 * nur über die Materialanfrage-Umwandlung (siehe MaterialRequestPanel), nie direkt über dieses Formular. */
export function TicketModal({ payload }: { payload?: TicketModalPayload }) {
  const { state, actions } = useApp();
  const editing = payload?.ticket ?? null;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [customerId, setCustomerId] = useState(editing?.customerId ?? payload?.customerId ?? state.customers[0]?.id ?? '');
  const [category, setCategory] = useState<TicketCategory | ''>(editing?.category ?? '');
  const [priority, setPriority] = useState<TicketPriority>(editing?.priority ?? 'normal');
  const [status, setStatus] = useState<TicketStatus>(editing?.status ?? 'neu');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(editing?.assignedEmployeeId ?? payload?.employeeId ?? '');
  const [assignedManagerId, setAssignedManagerId] = useState(editing?.assignedManagerId ?? '');
  const [startDate, setStartDate] = useState(editing?.startDate ?? isoDate(new Date()));
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? payload?.date ?? '');
  const [dueTime, setDueTime] = useState(editing?.dueTime ?? '');
  const [note, setNote] = useState(editing?.note ?? '');

  const activeEmployees = state.employees.filter((e) => e.status === 'aktiv');
  const managers = state.employees.filter((e) => e.status === 'aktiv' && (e.systemRole === 'manager' || e.systemRole === 'admin'));

  const save = () => {
    if (!title.trim()) return;
    const data = {
      type: 'aufgabe' as const,
      title: title.trim(),
      description,
      customerId: customerId || null,
      locationId: customerId || null,
      assignedEmployeeId: assignedEmployeeId || null,
      assignedManagerId: assignedManagerId || null,
      priority,
      status,
      startDate: startDate || null,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      category: category || null,
      note,
    };
    if (editing) {
      actions.updateTicket(editing.id, data);
    } else {
      actions.createTicket(data);
    }
    actions.closeModal();
  };

  return (
    <Modal
      title={editing ? `Ticket bearbeiten · ${editing.ticketNumber}` : 'Ticket erstellen'}
      onClose={() => actions.closeModal()}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!title.trim()}>
            <Icon name="check" /> Speichern
          </button>
        </>
      }
    >
      <div className="field">
        <label>Titel</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kurzer, klarer Titel" />
      </div>
      <div className="field">
        <label>Beschreibung</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Kunde / Objekt</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">– Kein Objekt –</option>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Kategorie</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
            <option value="">– Keine Kategorie –</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
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
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
            <option value="neu">Neu</option>
            <option value="geplant">Geplant</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="wartet_rueckmeldung">Wartet auf Rückmeldung</option>
            <option value="erledigt">Erledigt</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Zuständiger Mitarbeiter</label>
          <select value={assignedEmployeeId} onChange={(e) => setAssignedEmployeeId(e.target.value)}>
            <option value="">– Nicht zugewiesen –</option>
            {activeEmployees.map((e) => (
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
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Startdatum</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Fälligkeitsdatum</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Uhrzeit (optional)</label>
        <input type="time" value={dueTime ?? ''} onChange={(e) => setDueTime(e.target.value)} />
      </div>
      <div className="field">
        <label>Interne Notiz</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}
