import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';
import type { AbsenceType } from '../types';
import { isoDate } from '../utils/date';

export function MeAbsenceModal() {
  const { actions } = useApp();
  const [type, setType] = useState<AbsenceType>('Urlaub');
  const [start, setStart] = useState(isoDate(new Date()));
  const [end, setEnd] = useState(isoDate(new Date()));
  const [note, setNote] = useState('');

  const save = () => {
    actions.saveMeAbsence({ type, start, end, note });
    actions.closeModal();
  };

  return (
    <Modal
      title="Abwesenheit beantragen"
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="check" /> Antrag senden
          </button>
        </>
      }
    >
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
          <label>Startdatum</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>Enddatum</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Kommentar (optional)</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}
