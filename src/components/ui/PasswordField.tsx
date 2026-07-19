import React, { useState } from 'react';
import { Icon } from '../icons/Icon';
import { passwordStrength } from '../../utils/password';

/** Wiederverwendetes Passwort-Eingabefeld mit Anzeigen/Verbergen-Icon — genutzt beim Login, beim
 * Zurücksetzen, beim Anlegen eines Mitarbeiters und beim Ändern des eigenen Passworts im Profil. */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  onEnter,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  onEnter?: () => void;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="password-field">
        <input
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="••••••••"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) onEnter();
          }}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
          aria-pressed={show}
          onClick={() => setShow((v) => !v)}
        >
          <Icon name={show ? 'eyeOff' : 'eye'} />
        </button>
      </div>
    </div>
  );
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  if (strength === 'leer') return null;
  return (
    <div className={`pw-strength pw-strength-${strength}`}>
      <div className="pw-strength-bar">
        <span />
        <span />
        <span />
      </div>
      <span className="pw-strength-label">{strength === 'schwach' ? 'Zu schwach' : strength === 'mittel' ? 'Mittel' : 'Stark'}</span>
    </div>
  );
}
