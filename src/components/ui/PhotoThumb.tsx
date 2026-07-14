import React, { useEffect, useState } from 'react';
import { Icon } from '../icons/Icon';
import type { TicketAttachmentMeta } from '../../types';
import { getTicketAttachmentBlob } from '../../utils/ticketAttachmentStore';

/** Lädt ein in IndexedDB gespeichertes Foto (siehe utils/ticketAttachmentStore.ts) und zeigt eine echte
 * Bild-Vorschau statt nur eines Datei-Icons — für Materialbestellungen und Ticket-Anhänge gleichermassen. */
export function PhotoThumb({ photo, onRemove, onClick }: { photo: TicketAttachmentMeta; onRemove?: () => void; onClick?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objUrl: string | null = null;
    getTicketAttachmentBlob(photo.storageRef).then((blob) => {
      if (!active || !blob) return;
      objUrl = URL.createObjectURL(blob);
      setUrl(objUrl);
    });
    return () => {
      active = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [photo.storageRef]);

  return (
    <div className="photo-thumb" onClick={onClick}>
      {url ? <img src={url} alt={photo.fileName} /> : <div className="photo-thumb-loading" />}
      {onRemove ? (
        <button
          className="photo-thumb-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Icon name="close" />
        </button>
      ) : null}
    </div>
  );
}
