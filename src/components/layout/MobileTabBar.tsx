import React from 'react';
import { Icon } from '../icons/Icon';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { navConfigFor } from '../../state/nav';
import { getUnreadTotalFor } from '../../state/chat';
import type { ViewId } from '../../types';

/** Nur die wirklich notwendigen Bereiche direkt in der Bottom-Bar — kein „Mehr" mehr. Weniger wichtige
 * Bereiche (Profil, Abwesenheiten) sind stattdessen über das Profilmenü oben rechts erreichbar. */
const PRIMARY_VIEWS: ViewId[] = ['me-time', 'me-schedule', 'me-hours', 'messages', 'me-material-order'];
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
  if (role !== 'mitarbeiter') return null;
  const nav = navConfigFor(role, state);
  const unreadMessages = getUnreadTotalFor(state, user?.id);

  const primary = PRIMARY_VIEWS.map((v) => nav.find((n) => n.view === v)).filter((n): n is NonNullable<typeof n> => !!n);

  return (
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
    </div>
  );
}
