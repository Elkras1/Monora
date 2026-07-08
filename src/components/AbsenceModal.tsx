import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { useApp } from '../state/AppContext';
import type { AbsenceType } from '../types';
import { isoDate } from '../utils/date';

export function AbsenceModal() {
  const { state, actions } = useApp();
  const [employeeId, setEmployeeId] = useState(state.employees[0]?.id ?? '');
  const [type, setType] = useState<AbsenceType>('Urlaub');
  const [start, setStart] = useState(isoDate(new Date()));
  const [end, setEnd] = useState(isoDate(new Date()));
  const [note, setNote] = useState('');

  const save = () => {
    actions.saveAbsence({ employeeId, type, start, end, note });
    actions.closeModal();
  };

  return (
    <Modal
      title="Abwesenheit erfassen"
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save}>
            Antrag erfassen
          </button>
        </>
      }
    >
      <div className="field">
        <label>Mitarbeiter</label>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          {state.employees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Art</label>
        <select value={type} onChange={(e) => setType(e.target.value as AbsenceType)}>
          <option value="Urlaub">Ferien</option>
          <option value="Krankheit">Krankheit</option>
          <option value="Unfall">Unfall</option>
          <option value="Unbezahlt">Unbezahlt</option>
          <option value="Sonstiges">Sonstiges</option>
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Von</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>Bis</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Notiz</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}
