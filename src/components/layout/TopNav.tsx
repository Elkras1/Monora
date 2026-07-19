import React from 'react';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { navConfigFor, groupNavItems } from '../../state/nav';
import { getUnreadTotalFor } from '../../state/chat';
import { unreadNotificationCountFor } from '../../state/notifications';
import { roleLabel } from '../../data/permissions';
import type { ViewId } from '../../types';

export function TopNav() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const nav = navConfigFor(role, state);
  if (!user) return null;
  const unreadMessages = getUnreadTotalFor(state, user.id);
  const unreadNotifs = unreadNotificationCountFor(state, role, user.id);

  // Chat steht nicht mehr zwischen den normalen Menüpunkten, sondern als eigenes Icon rechts (siehe unten) —
  // hier deshalb aus der Hauptnavigation herausgefiltert, ohne `navConfigFor`/`groupNavItems` selbst zu
  // verändern (die bleiben unverändert für die mobile mitarbeiter Ansicht sowie die admin/manager-Sidebar).
  const items = groupNavItems(nav).filter((item) => item.view !== 'messages');
  const activeGroup = items.find((item) => item.groupViews?.includes(state.view));

  return (
    <>
      <div className="topnav">
        <button className="topnav-brand" onClick={() => actions.setView(nav[0]?.view ?? 'dashboard')}>
          <img src="/planico-logo-white.svg" alt="Planico" className="brand-mark" />
        </button>
        <nav className="topnav-links" aria-label="Hauptnavigation">
          {items.map((item) => {
            const active = item.view ? state.view === item.view : !!item.groupViews?.includes(state.view);
            const targetView: ViewId = item.view ?? (item.groupViews as ViewId[])[0];
            const onClick = () => actions.setView(targetView);
            return (
              <button
                key={item.key}
                className={`topnav-link ${active ? 'active' : ''}`}
                onClick={onClick}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                data-tooltip={item.label}
                title={item.label}
              >
                <Icon name={item.icon} />
                {(item.view === 'tickets' || item.groupViews?.includes('tickets')) && unreadNotifs > 0 ? (
                  <span className="topnav-link-badge">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="topnav-right">
          <button
            className="icon-btn"
            onClick={() => actions.setView('messages')}
            aria-label="Chat"
            aria-current={state.view === 'messages' ? 'page' : undefined}
            data-tooltip="Chat"
            title="Chat"
          >
            <Icon name="message" />
            {unreadMessages > 0 ? <span className="topnav-link-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</span> : null}
          </button>
          <NotificationBell />
          <button
            className="user-chip"
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleUserMenu();
            }}
            aria-label={`Profilmenü — ${user.name}, ${roleLabel(role)}`}
            data-tooltip={`${user.name} · ${roleLabel(role)}`}
            title={`${user.name} · ${roleLabel(role)}`}
          >
            <Avatar id={user.id} name={user.name} photoUrl={user.photoUrl} size={30} fontSize={12} />
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
