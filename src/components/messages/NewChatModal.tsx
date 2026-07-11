import React, { useState } from 'react';
import { Modal } from '../ui/Overlay';
import { Avatar } from '../ui/Avatar';
import { Empty } from '../ui/Empty';
import { Icon } from '../icons/Icon';
import { useApp } from '../../state/AppContext';
import { allowedPartnersFor } from '../../state/chat';
import { roleLabel } from '../../data/permissions';

export function NewChatModal({ meId, onClose, onPick }: { meId: string; onClose: () => void; onPick: (partnerId: string) => void }) {
  const { state } = useApp();
  const [q, setQ] = useState('');
  const partners = allowedPartnersFor(state, meId).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Modal title="Neuer Chat" onClose={onClose}>
      <div className="search" style={{ marginBottom: 12, width: '100%' }}>
        <Icon name="search" />
        <input placeholder="Mitarbeiter suchen…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      {partners.length ? (
        <div className="chat-picker-list">
          {partners.map((p) => (
            <button key={p.id} className="chat-picker-item" onClick={() => onPick(p.id)}>
              <Avatar id={p.id} name={p.name} photoUrl={p.photoUrl} size={38} fontSize={14} />
              <div>
                <div className="name">{p.name}</div>
                <div className="hint">{roleLabel(p.systemRole)}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty icon="message" text="Keine passenden Mitarbeitenden gefunden." />
      )}
    </Modal>
  );
}
