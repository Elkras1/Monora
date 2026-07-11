import React from 'react';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { UserMenu } from './UserMenu';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { navConfigFor, groupNavItems } from '../../state/nav';
import { getUnreadTotalFor } from '../../state/chat';
import { roleLabel } from '../../data/permissions';
import type { ViewId } from '../../types';

export function TopNav() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const nav = navConfigFor(role, state);
  if (!user) return null;
  const unreadMessages = getUnreadTotalFor(state, user.id);

  const items = groupNavItems(nav);
  const activeGroup = items.find((item) => item.groupViews?.includes(state.view));

  return (
    <>
      <div className="topnav">
        <button className="topnav-brand" onClick={() => actions.setView(nav[0]?.view ?? 'dashboard')}>
          <div className="brand-mark">
            <Icon name="droplet" />
          </div>
          <span className="topnav-brand-name">Monora</span>
        </button>
        <nav className="topnav-links">
          {items.map((item) => {
            const active = item.view ? state.view === item.view : !!item.groupViews?.includes(state.view);
            const targetView: ViewId = item.view ?? (item.groupViews as ViewId[])[0];
            const onClick = () => actions.setView(targetView);
            return (
              <button key={item.key} className={`topnav-link ${active ? 'active' : ''}`} onClick={onClick} title={item.label}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {(item.view === 'messages' || item.groupViews?.includes('messages')) && unreadMessages > 0 ? (
                  <span className="nav-unread-badge">{unreadMessages}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="topnav-right">
          {role !== 'mitarbeiter' ? (
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
      {activeGroup?.groupViews ? (
        <div className="topnav-subnav">
          {activeGroup.groupViews.map((v) => {
            const item = nav.find((n) => n.view === v);
            if (!item) return null;
            return (
              <button key={v} className={`tab ${state.view === v ? 'active' : ''}`} onClick={() => actions.setView(v)}>
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
