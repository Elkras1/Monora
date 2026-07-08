import React from 'react';
import { useApp, useCurrentUser } from '../../state/AppContext';
import { Icon } from '../../components/icons/Icon';
import { colorFor, initials } from '../../utils/format';

export function MeProfilePage() {
  const { state, actions } = useApp();
  const user = useCurrentUser();
  if (!user) return null;
  const customers = state.customers.filter((c) => user.customerIds.includes(c.id));

  return (
    <>
      <div className="card" style={{ textAlign: 'center', padding: '28px 20px', marginBottom: 16 }}>
        <div className="avatar" style={{ background: colorFor(user.id), width: 64, height: 64, fontSize: 22, margin: '0 auto 12px' }}>
          {initials(user.name)}
        </div>
        <h2>{user.name}</h2>
        <div className="hint">{user.role}</div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>Angaben</h3>
          <button className="muted-link" onClick={() => actions.openModal('meProfile')}>
            <Icon name="edit" /> Bearbeiten
          </button>
        </div>
        <div className="detail-grid">
          <div>
            <span className="dl">E-Mail</span>
            <span className="dv">{user.email}</span>
          </div>
          <div>
            <span className="dl">Telefon</span>
            <span className="dv">{user.phone}</span>
          </div>
          <div>
            <span className="dl">Standort(e)</span>
            <span className="dv">{customers.length ? customers.map((x) => x.name).join(', ') : '–'}</span>
          </div>
          <div>
            <span className="dl">Rolle</span>
            <span className="dv">{user.role}</span>
          </div>
          <div>
            <span className="dl">Wochenstunden (Soll)</span>
            <span className="dv">{state.settings.weeklyHours} h</span>
          </div>
        </div>
      </div>
      <div className="hint">Nur vom Administrator freigegebene Felder können hier bearbeitet werden.</div>
    </>
  );
}
