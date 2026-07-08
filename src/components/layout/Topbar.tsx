import React from 'react';
import { Icon } from '../icons/Icon';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { roleLabel } from '../../data/permissions';
import { VIEW_META } from '../../state/nav';
import { colorFor, initials } from '../../utils/format';

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
          <div className="avatar" style={{ background: colorFor(user.id), width: 30, height: 30, fontSize: 12 }}>
            {initials(user.name)}
          </div>
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

function UserMenu() {
  const { actions } = useApp();
  const user = useCurrentUser();
  const role = useCurrentRole();
  if (!user) return null;
  return (
    <div className="user-menu" onClick={(e) => e.stopPropagation()}>
      <div className="user-menu-head">Angemeldet als</div>
      <div className="user-menu-current">
        <div className="avatar" style={{ background: colorFor(user.id), width: 32, height: 32 }}>
          {initials(user.name)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{user.name}</div>
          <div className="hint">{user.role} · automatisch erkannt: {roleLabel(role)}</div>
        </div>
      </div>
      <div className="hint" style={{ padding: '10px 4px 4px' }}>
        Deine Rolle wird automatisch anhand deines Kontos erkannt und kann hier nicht verändert werden.
      </div>
      <div className="divider" style={{ margin: '10px 0 8px' }} />
      <button className="user-menu-item" onClick={() => actions.logout()}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 8,
            background: 'var(--red-tint)',
            color: 'var(--red)',
          }}
        >
          <Icon name="close" />
        </span>
        <div style={{ fontWeight: 600, fontSize: 12.8, color: 'var(--red)' }}>Abmelden</div>
      </button>
    </div>
  );
}
