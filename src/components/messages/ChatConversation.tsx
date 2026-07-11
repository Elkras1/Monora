import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../state/AppContext';
import { getMessagesForChat, isChatParticipant } from '../../state/chat';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { roleLabel } from '../../data/permissions';
import { fmtDate, fmtTime, isoDate } from '../../utils/date';
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  deleteChatAttachmentBlob,
  getChatAttachmentBlob,
  isAllowedAttachment,
  isImageAttachment,
  saveChatAttachmentBlob,
} from '../../utils/chatAttachmentStore';
import { uid } from '../../utils/format';
import type { ChatMessage, Employee, MessageAttachmentMeta } from '../../types';

function dateLabel(iso: string): string {
  const day = isoDate(new Date(iso));
  const today = isoDate(new Date());
  const yesterday = isoDate(new Date(Date.now() - 86400000));
  if (day === today) return 'Heute';
  if (day === yesterday) return 'Gestern';
  return fmtDate(new Date(iso));
}

function fmtBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/** Lazily loads an attachment's bytes from IndexedDB just for this one thumbnail — avoids preloading every image in a chat at once. */
function AttachmentImage({ attachment, onOpen }: { attachment: MessageAttachmentMeta; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    getChatAttachmentBlob(attachment.storageRef).then((blob) => {
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.storageRef]);

  if (!url) return <div className="chat-attachment-image is-loading" />;
  return <img className="chat-attachment-image" src={url} alt={attachment.fileName} onClick={() => onOpen(url)} />;
}

function FileAttachmentCard({ attachment }: { attachment: MessageAttachmentMeta }) {
  const open = async () => {
    const blob = await getChatAttachmentBlob(attachment.storageRef);
    if (!blob) return;
    window.open(URL.createObjectURL(blob), '_blank');
  };
  const download = async () => {
    const blob = await getChatAttachmentBlob(attachment.storageRef);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="chat-file-card">
      <Icon name="fileText" />
      <div className="chat-file-card-info">
        <div className="name">{attachment.fileName}</div>
        <div className="size">{fmtBytes(attachment.size)}</div>
      </div>
      <button className="icon-btn" title="Öffnen" onClick={open}>
        <Icon name="eye" />
      </button>
      <button className="icon-btn" title="Herunterladen" onClick={download}>
        <Icon name="download" />
      </button>
    </div>
  );
}

export function ChatConversation({
  meId,
  chatId,
  partner,
  onBack,
}: {
  meId: string;
  chatId: string;
  partner: Employee;
  onBack: () => void;
}) {
  const { state, actions, toast } = useApp();
  const messages = getMessagesForChat(state, chatId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [chatId, messages.length]);

  useEffect(() => {
    actions.markChatRead(chatId, meId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messages.length, meId]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    actions.sendMessage({ senderId: meId, recipientId: partner.id, text: trimmed });
    setText('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAllowedAttachment(file)) {
      toast('Dieser Dateityp ist nicht erlaubt. Erlaubt: Bilder, PDF, Office- und Textdateien.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      toast(`Datei zu gross (max. ${Math.round(MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024)} MB im Prototyp).`);
      return;
    }
    const me = state.employees.find((e) => e.id === meId);
    const attachmentId = uid();
    setSending(true);
    try {
      await saveChatAttachmentBlob(attachmentId, file);
      const meta: MessageAttachmentMeta = {
        id: attachmentId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: me?.name ?? 'Unbekannt',
        storageRef: attachmentId,
      };
      actions.sendMessage({ senderId: meId, recipientId: partner.id, text: text.trim(), attachments: [meta] });
      setText('');
    } catch {
      await deleteChatAttachmentBlob(attachmentId).catch(() => {});
      toast('Datei konnte nicht gesendet werden.');
    } finally {
      setSending(false);
    }
  };

  let lastDay = '';

  return (
    <div className="chat-convo">
      <div className="chat-convo-head">
        <button className="icon-btn chat-back-btn" onClick={onBack} title="Zurück">
          <Icon name="chevL" />
        </button>
        <Avatar id={partner.id} name={partner.name} photoUrl={partner.photoUrl} size={36} fontSize={13} />
        <div>
          <div className="name">{partner.name}</div>
          <div className="hint">{roleLabel(partner.systemRole)}</div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length ? (
          messages.map((m) => {
            const day = isoDate(new Date(m.createdAt));
            const showSeparator = day !== lastDay;
            lastDay = day;
            const mine = m.senderId === meId;
            return (
              <React.Fragment key={m.id}>
                {showSeparator ? (
                  <div className="chat-date-sep">
                    <span>{dateLabel(m.createdAt)}</span>
                  </div>
                ) : null}
                <ChatBubbleRow message={m} mine={mine} chatId={chatId} meId={meId} onOpenImage={setLightboxUrl} />
              </React.Fragment>
            );
          })
        ) : (
          <div className="chat-empty-hint">
            <Icon name="message" />
            <p>Noch keine Nachrichten. Schreib die erste Nachricht an {partner.name.split(' ')[0]}.</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-composer">
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          accept={Object.keys(ALLOWED_ATTACHMENT_TYPES).join(',')}
          onChange={onFileSelected}
        />
        <button className="icon-btn chat-attach-btn" title="Foto oder Datei anhängen" onClick={() => fileInputRef.current?.click()} disabled={sending}>
          <Icon name="paperclip" />
        </button>
        <textarea
          className="chat-input"
          placeholder="Nachricht schreiben…"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="chat-send-btn" onClick={send} disabled={!text.trim()} title="Senden">
          <Icon name="send" />
        </button>
      </div>

      {lightboxUrl ? (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <div className="lightbox-top">
            <a className="icon-btn" href={lightboxUrl} download onClick={(e) => e.stopPropagation()} title="Herunterladen">
              <Icon name="download" />
            </a>
            <button className="icon-btn" onClick={() => setLightboxUrl(null)} title="Schliessen">
              <Icon name="close" />
            </button>
          </div>
          <img src={lightboxUrl} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}

function ChatBubbleRow({
  message,
  mine,
  chatId,
  meId,
  onOpenImage,
}: {
  message: ChatMessage;
  mine: boolean;
  chatId: string;
  meId: string;
  onOpenImage: (url: string) => void;
}) {
  const { state } = useApp();
  const canAccess = isChatParticipant(state, chatId, meId);
  return (
    <div className={`chat-bubble-row ${mine ? 'mine' : ''}`}>
      <div className="chat-bubble">
        {message.attachments && message.attachments.length && canAccess
          ? message.attachments.map((a) =>
              isImageAttachment(a.mimeType) ? (
                <AttachmentImage key={a.id} attachment={a} onOpen={onOpenImage} />
              ) : (
                <FileAttachmentCard key={a.id} attachment={a} />
              )
            )
          : null}
        {message.text ? <div className="chat-bubble-text">{message.text}</div> : null}
        <div className="chat-bubble-meta">
          <span>{fmtTime(new Date(message.createdAt))}</span>
          {mine ? (
            <span className={`chat-read-ticks ${message.read ? 'is-read' : ''}`}>
              <Icon name="check" />
              <Icon name="check" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
