import React from 'react';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { UserMenu } from './UserMenu';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { roleLabel } from '../../data/permissions';
import { VIEW_META } from '../../state/nav';

export function Topbar() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const isStaff = role === 'mitarbeiter';
  const [title, sub] = VIEW_META[state.view] ?? ['', ''];

  if (!user) return null;

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="icon-btn mobile-toggle" onClick={() => actions.toggleSidebar()}>
          <Icon name="menu" />
        </button>
        <div>
          <h1>{title}</h1>
          <div className="sub">{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        {!isStaff ? (
          <div className="geo-pill">
            <span className="geo-dot" /> Geofencing aktiv
          </div>
        ) : null}
        <button
          className="user-chip"
          onClick={(e) => {
            e.stopPropagation();
            actions.toggleUserMenu();
          }}
        >
          <Avatar id={user.id} name={user.name} photoUrl={user.photoUrl} size={30} fontSize={12} />
          <div className="user-chip-txt">
            <div className="n">{user.name.split(' ')[0]}</div>
            <div className="r">{roleLabel(role)}</div>
          </div>
        </button>
        {state.userMenuOpen ? <UserMenu /> : null}
      </div>
    </div>
  );
}
