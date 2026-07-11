/**
 * Local, browser-only storage for the raw bytes of employee documents (IndexedDB).
 *
 * Only small prototype files are expected here — `EmployeeDocumentMeta` (the JSON metadata that lives in
 * the normal app state / localStorage) stays lightweight, while the actual file content is kept in
 * IndexedDB under the same id. This split is deliberate: swapping this module for a real upload to
 * Supabase Storage (or any other document store) later only means changing `saveDocBlob`/`getDocBlob`/
 * `deleteDocBlob` — nothing else in the app needs to know where the bytes physically live.
 */

const DB_NAME = 'cleanflow-docs';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

/** Hard prototype limit so nobody accidentally stores a huge file in the browser. */
export const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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

export async function saveDocBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDocBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocBlob(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
