import React, { useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { useApp } from '../state/AppContext';

export function LoginPage() {
  const { state, actions } = useApp();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => actions.attemptLogin(name, password);

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            <Icon name="droplet" />
          </div>
          <div>
            <div className="brand-name" style={{ color: 'var(--ink)' }}>
              Monora
            </div>
            <div className="brand-sub" style={{ color: 'var(--ink-faint)' }}>
              Facility Workforce
            </div>
          </div>
        </div>
        <h2 style={{ marginTop: 18 }}>Anmelden</h2>
        <div className="hint" style={{ marginBottom: 18 }}>
          Melde dich mit deinem Namen und Passwort an. Deine Rolle (Admin, Manager oder Mitarbeiter) wird danach automatisch erkannt.
        </div>
        <div className="field">
          <label>Name</label>
          <input
            autoComplete="username"
            placeholder="Vor- und Nachname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        <div className="field">
          <label>Passwort</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        <div className="login-error">{state.loginError}</div>
        <button
          className="btn btn-accent"
          style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }}
          onClick={submit}
        >
          <Icon name="check" /> Anmelden
        </button>
      </div>
    </div>
  );
}
