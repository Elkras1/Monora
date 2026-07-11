import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { useApp } from '../state/AppContext';
import type { Service } from '../types';

export function ServiceModal({ payload }: { payload?: Service }) {
  const { actions, toast } = useApp();
  const editing = payload ?? null;

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');

  const save = () => {
    if (!name.trim()) {
      toast('Bitte einen Namen angeben.');
      return;
    }
    actions.saveService({ name: name.trim(), description: description.trim() }, editing?.id ?? null);
    actions.closeModal();
  };

  return (
    <Modal
      title={editing ? 'Leistung bearbeiten' : 'Neue Leistung'}
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save}>
            Speichern
          </button>
        </>
      }
    >
      <div className="field">
        <label>Name</label>
        <input type="text" placeholder="z. B. Fensterreinigung" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Beschreibung (optional)</label>
        <textarea rows={2} placeholder="Kurze Beschreibung der Leistung…" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {editing ? (
        <div className="hint">Aktiv/Inaktiv wird über den Schalter in der Liste gesteuert.</div>
      ) : null}
    </Modal>
  );
}
