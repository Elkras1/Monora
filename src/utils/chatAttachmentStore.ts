/**
 * Local, browser-only storage for the raw bytes of chat attachments (IndexedDB).
 *
 * Mirrors utils/docStore.ts but uses its own database so chat attachments stay logically separate from
 * HR documents (this maps cleanly onto two separate Supabase Storage buckets later: one for employee
 * documents, one for chat attachments). Only `MessageAttachmentMeta` (filename, type, size, ids) lives in
 * the normal app state / localStorage — the actual bytes never touch localStorage.
 *
 * Swapping this for Supabase Storage later only means replacing `saveChatAttachmentBlob`/
 * `getChatAttachmentBlob`/`deleteChatAttachmentBlob` — `MessageAttachmentMeta.storageRef` would then hold
 * a Storage path/URL instead of an IndexedDB key, and nothing else in the chat UI needs to change.
 */

const DB_NAME = 'cleanflow-chat-files';
const STORE_NAME = 'attachments';
const DB_VERSION = 1;

/** Prototype limit requested for chat attachments. */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTACHMENT_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'text/plain': ['txt'],
};

/** Some browsers report a blank or generic MIME type for Office files, so we also accept a known extension. */
export function isAllowedAttachment(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (file.type && ALLOWED_ATTACHMENT_TYPES[file.type]) return true;
  return Object.values(ALLOWED_ATTACHMENT_TYPES).some((exts) => exts.includes(ext));
}

export function isImageAttachment(mimeType: string): boolean {
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

export async function saveChatAttachmentBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getChatAttachmentBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteChatAttachmentBlob(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
