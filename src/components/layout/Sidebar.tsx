import React from 'react';
import { Icon } from '../icons/Icon';
import { useApp, useCurrentRole } from '../../state/AppContext';
import { navConfigFor } from '../../state/nav';
import { useClock } from '../../hooks/useClock';
import { pad } from '../../utils/date';

export function Sidebar() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const nav = navConfigFor(role, state);
  const now = useClock();

  return (
    <div className={`sidebar ${state.sidebarOpen ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <Icon name="droplet" />
        </div>
        <div>
          <div className="brand-name">Montora</div>
          <div className="brand-sub">Facility Workforce</div>
        </div>
      </div>
      <nav className="nav">
        {nav.map((n) => (
          <button
            key={n.view}
            className={`nav-item ${state.view === n.view ? 'active' : ''}`}
            onClick={() => actions.setView(n.view)}
          >
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="nav-foot">
        <div className="clock mono">
          {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
        </div>
        <div className="date">{now.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
      </div>
    </div>
  );
}
