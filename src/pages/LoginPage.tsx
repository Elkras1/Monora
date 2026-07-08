import React, { useState } from 'react';
import { Icon } from '../components/icons/Icon';
import { useApp } from '../state/AppContext';
import { colorFor, initials } from '../utils/format';

const ROLE_ORDER: Record<string, number> = { admin: 0, manager: 1, mitarbeiter: 2 };

export function LoginPage() {
  const { state, actions } = useApp();
  const active = [...state.employees].filter((e) => e.status === 'aktiv').sort((a, b) => a.name.localeCompare(b.name));
  const demoUsers = state.employees
    .filter((e) => ['Laura Keller', 'Marco Baumann', 'Luca Meier'].includes(e.name))
    .sort((a, b) => ROLE_ORDER[a.systemRole] - ROLE_ORDER[b.systemRole]);

  const [userId, setUserId] = useState(state.currentUserId ?? active[0]?.id ?? '');
  const [pin, setPin] = useState('');

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            <Icon name="droplet" />
          </div>
          <div>
            <div className="brand-name" style={{ color: 'var(--ink)' }}>
              Montora
            </div>
            <div className="brand-sub" style={{ color: 'var(--ink-faint)' }}>
              Facility Workforce
            </div>
          </div>
        </div>
        <h2 style={{ marginTop: 18 }}>Anmelden</h2>
        <div className="hint" style={{ marginBottom: 18 }}>
          Melde dich mit deinem Mitarbeiterkonto an. Deine Rolle (Admin, Manager oder Mitarbeiter) wird danach automatisch erkannt.
        </div>
        <div className="field">
          <label>Mitarbeiter</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            {active.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} – {e.role}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') actions.attemptLogin(userId, pin);
            }}
          />
        </div>
        <div className="login-error">{state.loginError}</div>
        <button
          className="btn btn-accent"
          style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }}
          onClick={() => actions.attemptLogin(userId, pin)}
        >
          <Icon name="check" /> Anmelden
        </button>

        <div className="login-demo-divider">
          <span>Demo-Zugänge für diesen Prototyp</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {demoUsers.map((e) => (
            <button key={e.id} className="login-demo-item" onClick={() => actions.quickDemoLogin(e.id)}>
              <div className="avatar" style={{ background: colorFor(e.id), width: 32, height: 32, fontSize: 12.5 }}>
                {initials(e.name)}
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}</div>
                <div className="hint">{e.role}</div>
              </div>
              <span className="hint">Anmelden →</span>
            </button>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 14, textAlign: 'center' }}>
          Prototyp-Zugänge zu Demozwecken – die Rolle wird auch hier automatisch aus dem Konto übernommen, nicht manuell gewählt.
        </div>
      </div>
    </div>
  );
}
