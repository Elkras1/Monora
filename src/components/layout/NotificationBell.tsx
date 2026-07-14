import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/Icon';
import { useApp, useCurrentRole, useCurrentUser } from '../../state/AppContext';
import { notificationsFor, unreadNotificationCountFor } from '../../state/notifications';
import type { AppNotification } from '../../types';

const TYPE_ICON: Record<AppNotification['type'], IconName> = {
  material_new: 'box',
  material_approved: 'check',
  material_rejected: 'close',
  material_ordered: 'box',
  material_delivered: 'check',
  ticket_urgent: 'alert',
  ticket_overdue: 'alert',
  ticket_assigned: 'ticket',
};

/** Glocken-Symbol mit Dropdown der neuesten Benachrichtigungen — für alle Rollen, Inhalt automatisch
 * auf Admin/Manager (alle) bzw. Mitarbeiter (nur eigene) gescoped, siehe state/notifications.ts. */
export function NotificationBell() {
  const { state, actions } = useApp();
  const role = useCurrentRole();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const list = notificationsFor(state, role, user?.id ?? null).slice(0, 8);
  const unread = unreadNotificationCountFor(state, role, user?.id ?? null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const openNotification = (n: AppNotification) => {
    setOpen(false);
    if (role !== 'mitarbeiter') {
      if (n.linkedMaterialRequestId) actions.setView('tickets-material');
      else if (n.linkedTicketId) actions.setView('tickets');
    }
    if (n.linkedTicketId) actions.openTicketPanel(n.linkedTicketId);
    else if (n.linkedMaterialRequestId) actions.openMaterialRequestPanel(n.linkedMaterialRequestId);
  };

  return (
    <div className="notif-bell-wrap" ref={rootRef}>
      <button
        className="icon-btn notif-bell-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Benachrichtigungen"
      >
        <Icon name="alert" />
        {unread > 0 ? <span className="notif-bell-badge">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="notif-dropdown-head">Benachrichtigungen{unread > 0 ? ` · ${unread} neu` : ''}</div>
          {list.length ? (
            <div className="notif-list">
              {list.map((n) => (
                <button key={n.id} className={`notif-item ${!n.read ? 'is-unread' : ''}`} onClick={() => openNotification(n)}>
                  <span className={`notif-item-icon type-${n.type}`}>
                    <Icon name={TYPE_ICON[n.type]} />
                  </span>
                  <span className="notif-item-body">
                    <span className="notif-item-title">{n.title}</span>
                    <span className="notif-item-msg">{n.message}</span>
                    <span className="notif-item-time">
                      {new Date(n.createdAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  {!n.read ? <span className="notif-item-dot" /> : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="hint" style={{ padding: '14px 12px' }}>
              Keine Benachrichtigungen.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
