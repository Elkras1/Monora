import React, { useState } from 'react';
import { Icon } from '../icons/Icon';
import { Drawer } from '../ui/Overlay';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { navConfigFor } from '../../state/nav';
import { getUnreadTotalFor } from '../../state/chat';
import type { ViewId } from '../../types';

/** Höchstens 4 Punkte direkt in der Bottom-Bar, alles Weitere hinter „Mehr" — hält die mobile Mitarbeiter-Navigation einfach. */
const PRIMARY_VIEWS: ViewId[] = ['me-time', 'me-schedule', 'messages', 'me-profile'];

export function MobileTabBar() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const [showMore, setShowMore] = useState(false);
  if (role !== 'mitarbeiter') return null;
  const nav = navConfigFor(role, state);
  const unreadMessages = getUnreadTotalFor(state, user?.id);

  const primary = PRIMARY_VIEWS.map((v) => nav.find((n) => n.view === v)).filter((n): n is NonNullable<typeof n> => !!n);
  const overflow = nav.filter((n) => !PRIMARY_VIEWS.includes(n.view));
  const overflowActive = overflow.some((n) => n.view === state.view);

  return (
    <>
      <div className="mobile-tabbar">
        {primary.map((n) => (
          <button key={n.view} className={`mtab ${state.view === n.view ? 'active' : ''}`} onClick={() => actions.setView(n.view)}>
            <span className="mtab-icon">
              <Icon name={n.icon} />
              {n.view === 'messages' && unreadMessages > 0 ? <span className="nav-unread-dot" /> : null}
            </span>
            <span>{n.label.split(' ')[0]}</span>
          </button>
        ))}
        {overflow.length ? (
          <button className={`mtab ${overflowActive ? 'active' : ''}`} onClick={() => setShowMore(true)}>
            <Icon name="menu" />
            <span>Mehr</span>
          </button>
        ) : null}
      </div>
      {showMore ? (
        <Drawer title="Mehr" onClose={() => setShowMore(false)}>
          <div className="nav-more-list">
            {overflow.map((n) => (
              <button
                key={n.view}
                className={`nav-more-item ${state.view === n.view ? 'active' : ''}`}
                onClick={() => {
                  actions.setView(n.view);
                  setShowMore(false);
                }}
              >
                <Icon name={n.icon} />
                <span>{n.label}</span>
              </button>
            ))}
          </div>
        </Drawer>
      ) : null}
    </>
  );
}
