import React from 'react';
import { Icon } from '../icons/Icon';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { navConfigFor, groupNavItems } from '../../state/nav';
import { getUnreadTotalFor } from '../../state/chat';
import { useClock } from '../../hooks/useClock';
import { pad } from '../../utils/date';

export function Sidebar() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const nav = navConfigFor(role, state);
  const now = useClock();
  const unreadMessages = getUnreadTotalFor(state, user?.id);
  const items = groupNavItems(nav);

  return (
    <div className={`sidebar ${state.sidebarOpen ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <Icon name="droplet" />
        </div>
        <div>
          <div className="brand-name">Monora</div>
          <div className="brand-sub">Facility Workforce</div>
        </div>
      </div>
      <nav className="nav">
        {items.map((item) =>
          item.groupViews ? (
            <div className="nav-group" key={item.key}>
              <div className="nav-group-label">
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </div>
              {item.groupViews.map((v) => {
                const child = nav.find((n) => n.view === v);
                if (!child) return null;
                return (
                  <button
                    key={v}
                    className={`nav-item nav-item-sub ${state.view === v ? 'active' : ''}`}
                    onClick={() => actions.setView(v)}
                  >
                    <Icon name={child.icon} />
                    <span>{child.label}</span>
                    {v === 'messages' && unreadMessages > 0 ? <span className="nav-unread-badge">{unreadMessages}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              key={item.key}
              className={`nav-item ${state.view === item.view ? 'active' : ''}`}
              onClick={() => actions.setView(item.view!)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.view === 'messages' && unreadMessages > 0 ? <span className="nav-unread-badge">{unreadMessages}</span> : null}
            </button>
          )
        )}
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
