import React, { useState } from 'react';
import { Modal } from './ui/Overlay';
import { Icon } from './icons/Icon';
import { PasswordField, PasswordStrengthMeter } from './ui/PasswordField';
import { useApp } from '../state/AppContext';
import { passwordRequirementsMet } from '../utils/password';

/** Mitarbeiter/Admin/Manager ändern im eigenen Profil ihr eigenes Passwort — nie das eines anderen
 * Kontos (siehe changeMyPassword: prüft immer nur gegen state.currentUserId). */
export function MeChangePasswordModal() {
  const { actions, toast } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');

  const save = () => {
    if (!current) {
      toast('Bitte dein aktuelles Passwort eingeben.');
      return;
    }
    if (!passwordRequirementsMet(next)) {
      toast('Neues Passwort muss mind. 8 Zeichen, einen Buchstaben und eine Zahl enthalten.');
      return;
    }
    if (next !== next2) {
      toast('Die neuen Passwörter stimmen nicht überein.');
      return;
    }
    const ok = actions.changeMyPassword(current, next);
    if (ok) actions.closeModal();
  };

  return (
    <Modal
      title="Passwort ändern"
      onClose={() => actions.closeModal()}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => actions.closeModal()}>
            Abbrechen
          </button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="check" /> Passwort speichern
          </button>
        </>
      }
    >
      <PasswordField label="Aktuelles Passwort" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField label="Neues Passwort" value={next} onChange={setNext} autoComplete="new-password" />
      <PasswordStrengthMeter password={next} />
      <PasswordField label="Neues Passwort bestätigen" value={next2} onChange={setNext2} autoComplete="new-password" onEnter={save} />
      <div className="hint">Mindestens 8 Zeichen, mit Buchstaben und Zahl.</div>
    </Modal>
  );
}
