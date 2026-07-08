import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { useApp, useCurrentUser } from '../state/AppContext';

export function MeProfileModal() {
  const { state, actions } = useApp();
  const user = useCurrentUser();
  const fields = state.settings.profileEditableFields;
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  const save = () => {
    actions.saveMeProfile({ phone, email });
  };

  return (
    <Modal
      title="Profil bearbeiten"
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="check" /> Speichern
          </button>
        </>
      }
    >
      <div className="field">
        <label>Telefonnummer</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!fields.phone} />
      </div>
      <div className="field">
        <label>E-Mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!fields.email} />
      </div>
      {!fields.phone && !fields.email ? (
        <div className="hint">Dein Administrator hat aktuell keine Profilfelder zur Selbstbearbeitung freigegeben.</div>
      ) : null}
    </Modal>
  );
}
