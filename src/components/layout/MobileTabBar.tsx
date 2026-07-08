import React from 'react';
import { Icon } from '../icons/Icon';
import { useApp, useCurrentRole } from '../../state/AppContext';
import { navConfigFor } from '../../state/nav';

export function MobileTabBar() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  if (role !== 'mitarbeiter') return null;
  const nav = navConfigFor(role, state);
  return (
    <div className="mobile-tabbar">
      {nav.map((n) => (
        <button key={n.view} className={`mtab ${state.view === n.view ? 'active' : ''}`} onClick={() => actions.setView(n.view)}>
          <Icon name={n.icon} />
          <span>{n.label.split(' ')[0]}</span>
        </button>
      ))}
    </div>
  );
}
