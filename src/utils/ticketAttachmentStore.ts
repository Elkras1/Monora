/**
 * Local, browser-only storage for the raw bytes of ticket/material-request attachments (IndexedDB).
 *
 * Mirrors utils/chatAttachmentStore.ts / utils/docStore.ts but uses its own database so ticket files stay
 * logically separate (maps cleanly onto its own Supabase Storage bucket later). Only `TicketAttachmentMeta`
 * (filename, type, size, ids) lives in the normal app state / localStorage — the actual bytes never touch
 * localStorage. Swapping this for Supabase Storage later only means replacing the three functions below —
 * `TicketAttachmentMeta.storageRef` would then hold a Storage path/URL instead of an IndexedDB key.
 */

const DB_NAME = 'cleanflow-ticket-files';
const STORE_NAME = 'attachments';
const DB_VERSION = 1;

/** Prototype limit requested for ticket/material attachments. */
export const MAX_TICKET_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_TICKET_ATTACHMENT_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
};

/** Some browsers report a blank or generic MIME type for Office files, so we also accept a known extension. */
export function isAllowedTicketAttachment(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (file.type && ALLOWED_TICKET_ATTACHMENT_TYPES[file.type]) return true;
  return Object.values(ALLOWED_TICKET_ATTACHMENT_TYPES).some((exts) => exts.includes(ext));
}

export function isImageTicketAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTicketAttachmentBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTicketAttachmentBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTicketAttachmentBlob(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
