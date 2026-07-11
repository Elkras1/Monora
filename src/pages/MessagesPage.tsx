import React, { useState } from 'react';
import { useApp, useCurrentUser } from '../state/AppContext';
import { getChatListFor, makeChatId } from '../state/chat';
import { Avatar } from '../components/ui/Avatar';
import { Empty } from '../components/ui/Empty';
import { Icon } from '../components/icons/Icon';
import { ChatConversation } from '../components/messages/ChatConversation';
import { NewChatModal } from '../components/messages/NewChatModal';
import { roleLabel } from '../data/permissions';
import { fmtDate, fmtTime, isoDate } from '../utils/date';

function fmtLastMessageTime(iso: string): string {
  const d = new Date(iso);
  return isoDate(d) === isoDate(new Date()) ? fmtTime(d) : fmtDate(d);
}

export function MessagesPage() {
  const { state } = useApp();
  const me = useCurrentUser();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  if (!me) return null;
  const actingId = me.id;

  const canStartNew = me.systemRole === 'admin' || me.systemRole === 'manager';
  const list = getChatListFor(state, actingId);
  const activeEntry = list.find((l) => l.chatId === activeChatId) ?? null;

  return (
    <div className="chat-shell">
      <div className={`chat-list-pane ${activeChatId ? 'is-hidden-mobile' : ''}`}>
        <div className="chat-list-head">
          <h3>Chat</h3>
          {canStartNew ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)}>
              <Icon name="plus" /> Neuer Chat
            </button>
          ) : null}
        </div>
        <div className="hint" style={{ padding: '0 4px 10px' }}>
          Der Chat wird aktuell nur lokal in diesem Browser gespeichert – kein geräteübergreifender Chat.
        </div>
        {list.length ? (
          <div className="chat-list">
            {list.map((entry) => (
              <button
                key={entry.chatId}
                className={`chat-list-item ${entry.chatId === activeChatId ? 'active' : ''}`}
                onClick={() => setActiveChatId(entry.chatId)}
              >
                <Avatar id={entry.partner.id} name={entry.partner.name} photoUrl={entry.partner.photoUrl} size={44} fontSize={15} />
                <div className="chat-list-item-body">
                  <div className="chat-list-item-top">
                    <span className="name">{entry.partner.name}</span>
                    {entry.lastMessage ? <span className="time">{fmtLastMessageTime(entry.lastMessage.createdAt)}</span> : null}
                  </div>
                  <div className="chat-list-item-bottom">
                    <span className="preview">
                      {entry.lastMessage
                        ? entry.lastMessage.text || (entry.lastMessage.attachments?.length ? '📎 Anhang' : '')
                        : `${roleLabel(entry.partner.systemRole)} · Noch keine Nachrichten`}
                    </span>
                    {entry.unreadCount ? <span className="chat-unread-badge">{entry.unreadCount}</span> : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty icon="message" text="Keine Chatpartner verfügbar." />
        )}
      </div>

      <div className={`chat-convo-pane ${!activeChatId ? 'is-hidden-mobile' : ''}`}>
        {activeEntry ? (
          <ChatConversation
            key={activeEntry.chatId}
            meId={actingId}
            chatId={activeEntry.chatId}
            partner={activeEntry.partner}
            onBack={() => setActiveChatId(null)}
          />
        ) : (
          <div className="chat-convo-empty">
            <Icon name="message" />
            <p>Wähle einen Chat aus der Liste.</p>
          </div>
        )}
      </div>

      {showNewChat ? (
        <NewChatModal
          meId={actingId}
          onClose={() => setShowNewChat(false)}
          onPick={(partnerId) => {
            setShowNewChat(false);
            setActiveChatId(makeChatId(actingId, partnerId));
          }}
        />
      ) : null}
    </div>
  );
}
