import React from 'react';
import { useApp } from '../state/AppContext';
import { PERMISSION_GROUPS, roleLabel } from '../data/permissions';

export function PermissionsPage() {
  const { state, actions } = useApp();
  const role = state.filter.permRole ?? 'manager';
  const perms = state.permissions[role];

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          <button className={`tab ${role === 'manager' ? 'active' : ''}`} onClick={() => actions.setFilter({ permRole: 'manager' })}>
            Manager
          </button>
          <button className={`tab ${role === 'mitarbeiter' ? 'active' : ''}`} onClick={() => actions.setFilter({ permRole: 'mitarbeiter' })}>
            Mitarbeiter
          </button>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => actions.resetPermissions(role)}>
          Auf Standard zurücksetzen
        </button>
      </div>
      <div className="hint" style={{ marginBottom: 16 }}>
        Der Administrator hat immer vollen Zugriff auf alle Bereiche. Diese Matrix bestimmt, was die Rolle{' '}
        <b>{roleLabel(role)}</b> in der App sehen und tun darf.
      </div>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        {PERMISSION_GROUPS.map((g) => (
          <div className="card" key={g.id}>
            <div className="card-head">
              <h3>{g.label}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {g.perms.map((p) => (
                <label className="perm-row" key={p.id}>
                  <span>{p.label}</span>
                  <span className={`toggle ${perms[p.id] ? 'on' : ''}`} onClick={() => actions.togglePermission(role, p.id)}>
                    <span className="toggle-knob" />
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="card">
          <div className="card-head">
            <h3>Profil-Bearbeitung (nur Mitarbeiter)</h3>
          </div>
          <div className="hint" style={{ marginBottom: 10 }}>
            Welche Profilfelder dürfen Mitarbeitende in ihrem eigenen Profil selbst ändern?
          </div>
          {(['phone', 'email'] as const).map((k) => (
            <label className="perm-row" key={k}>
              <span>{k === 'phone' ? 'Telefonnummer' : 'E-Mail-Adresse'}</span>
              <span
                className={`toggle ${state.settings.profileEditableFields[k] ? 'on' : ''}`}
                onClick={() => actions.toggleProfileField(k)}
              >
                <span className="toggle-knob" />
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
