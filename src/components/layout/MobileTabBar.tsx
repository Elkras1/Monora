import React, { useState } from 'react';
import { Icon } from '../icons/Icon';
import { Drawer } from '../ui/Overlay';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { navConfigFor } from '../../state/nav';
import { getUnreadTotalFor } from '../../state/chat';
import { unreadNotificationCountFor } from '../../state/notifications';
import type { ViewId } from '../../types';

/** Die wirklich notwendigen Bereiche direkt in der Bottom-Bar, alles Weitere hinter „Mehr" — hält die mobile Mitarbeiter-Navigation einfach. */
const PRIMARY_VIEWS: ViewId[] = ['me-time', 'me-schedule', 'me-hours', 'me-material-order', 'messages'];
/** Kurze, eindeutige Tab-Beschriftungen statt des ersten Worts des vollen Nav-Labels (das bei
 * mehrteiligen Titeln wie „Mein Dienstplan" nur „Mein" zeigen würde). */
const TAB_SHORT_LABEL: Partial<Record<ViewId, string>> = {
  'me-time': 'Zeit',
  'me-schedule': 'Dienstplan',
  'me-hours': 'Stunden',
  'me-material-order': 'Material',
  messages: 'Chat',
};

export function MobileTabBar() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const [showMore, setShowMore] = useState(false);
  if (role !== 'mitarbeiter') return null;
  const nav = navConfigFor(role, state);
  const unreadMessages = getUnreadTotalFor(state, user?.id);
  const unreadNotifs = unreadNotificationCountFor(state, role, user?.id ?? null);

  const primary = PRIMARY_VIEWS.map((v) => nav.find((n) => n.view === v)).filter((n): n is NonNullable<typeof n> => !!n);
  const overflow = nav.filter((n) => !PRIMARY_VIEWS.includes(n.view) && n.view !== 'me-start');
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
            <span>{TAB_SHORT_LABEL[n.view] ?? n.label}</span>
          </button>
        ))}
        {overflow.length ? (
          <button className={`mtab ${overflowActive ? 'active' : ''}`} onClick={() => setShowMore(true)}>
            <span className="mtab-icon">
              <Icon name="menu" />
              {unreadNotifs > 0 ? <span className="nav-unread-dot" /> : null}
            </span>
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
