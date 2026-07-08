import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp } from '../state/AppContext';

export function MeCorrectionModal({ payload }: { payload?: { entryId: string } }) {
  const { actions, toast } = useApp();
  const [note, setNote] = useState('');

  const submit = () => {
    if (!note.trim()) {
      toast('Bitte eine kurze Beschreibung angeben.');
      return;
    }
    if (payload?.entryId) actions.submitMeCorrection(payload.entryId, note.trim());
  };

  return (
    <Modal
      title="Korrektur beantragen"
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={submit}>
            <Icon name="check" /> Anfrage senden
          </button>
        </>
      }
    >
      <div className="field">
        <label>Was soll korrigiert werden?</label>
        <textarea rows={3} placeholder="z. B. Kommen war 08:00 statt 08:30…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="hint">
        Deine Anfrage wird an die Verwaltung gesendet und dort geprüft. Der Eintrag selbst bleibt bis dahin unverändert.
      </div>
    </Modal>
  );
}
