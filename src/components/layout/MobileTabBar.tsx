import React, { useState } from 'react';
import { Icon } from '../icons/Icon';
import { Drawer } from '../ui/Overlay';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { navConfigFor } from '../../state/nav';
import { getUnreadTotalFor } from '../../state/chat';
import type { ViewId } from '../../types';
import type { IconName } from '../icons/Icon';

/** Nur Icons, keine Beschriftungen — die vier wichtigsten Bereiche direkt in der Bottom-Bar, alles
 * Weitere hinter dem Drei-Striche-Menü ganz rechts. */
const PRIMARY_VIEWS: ViewId[] = ['me-time', 'me-schedule', 'me-hours', 'messages'];

const MENU_ITEMS: { view: ViewId; icon: IconName; label: string }[] = [
  { view: 'me-material-order', icon: 'box', label: 'Material bestellen' },
  { view: 'me-absence', icon: 'absence', label: 'Abwesenheiten' },
  { view: 'me-profile', icon: 'users2', label: 'Profil' },
  { view: 'me-profile', icon: 'settings', label: 'Einstellungen' },
];

export function MobileTabBar() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  if (role !== 'mitarbeiter') return null;
  const nav = navConfigFor(role, state);
  const unreadMessages = getUnreadTotalFor(state, user?.id);

  const primary = PRIMARY_VIEWS.map((v) => nav.find((n) => n.view === v)).filter((n): n is NonNullable<typeof n> => !!n);
  const menuActive = MENU_ITEMS.some((it) => it.view === state.view);

  return (
    <>
      <div className="mobile-tabbar">
        {primary.map((n) => (
          <button
            key={n.view}
            className={`mtab ${state.view === n.view ? 'active' : ''}`}
            onClick={() => actions.setView(n.view)}
            aria-label={n.label}
            title={n.label}
            aria-current={state.view === n.view ? 'page' : undefined}
          >
            <span className="mtab-icon">
              <Icon name={n.icon} />
              {n.view === 'messages' && unreadMessages > 0 ? <span className="nav-unread-dot" /> : null}
            </span>
          </button>
        ))}
        <button
          className={`mtab ${menuActive ? 'active' : ''}`}
          onClick={() => setMenuOpen(true)}
          aria-label="Menü"
          title="Menü"
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <span className="mtab-icon">
            <Icon name="menu" />
          </span>
        </button>
      </div>

      {menuOpen ? (
        <Drawer title="Menü" onClose={() => setMenuOpen(false)}>
          <div className="me-more-list">
            {MENU_ITEMS.map((it, i) => (
              <button
                key={i}
                className={`user-menu-item ${state.view === it.view ? 'active' : ''}`}
                onClick={() => {
                  actions.setView(it.view);
                  setMenuOpen(false);
                }}
              >
                <span className="me-more-item-icon">
                  <Icon name={it.icon} />
                </span>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.label}</div>
              </button>
            ))}
            <div className="divider" style={{ margin: '10px 0 8px' }} />
            <button
              className="user-menu-item"
              onClick={() => {
                setMenuOpen(false);
                actions.logout();
              }}
            >
              <span
                className="me-more-item-icon"
                style={{ background: 'var(--red-tint)', color: 'var(--red)' }}
              >
                <Icon name="close" />
              </span>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--red)' }}>Abmelden</div>
            </button>
          </div>
        </Drawer>
      ) : null}
    </>
  );
}
