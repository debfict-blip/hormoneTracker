// Thin IndexedDB wrapper. One object store per collection, keyPath "id".
export const STORES = ['meta', 'logs', 'cycles', 'products', 'usage', 'symptoms', 'photos', 'observations', 'photo_blobs'] as const;
export type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('skin-cycle-tracker', 1);
    r.onupgradeneeded = () => { for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const done = (tx: IDBTransaction) => new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
const req = <T>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function getAll<T>(s: StoreName): Promise<T[]> { return req((await open()).transaction(s).objectStore(s).getAll()); }
export async function get<T>(s: StoreName, id: string): Promise<T | undefined> { return req((await open()).transaction(s).objectStore(s).get(id)); }
export async function put(s: StoreName, v: unknown) { const tx = (await open()).transaction(s, 'readwrite'); tx.objectStore(s).put(v); await done(tx); }
export async function del(s: StoreName, id: string) { const tx = (await open()).transaction(s, 'readwrite'); tx.objectStore(s).delete(id); await done(tx); }
export async function clearAll() { const tx = (await open()).transaction([...STORES], 'readwrite'); for (const s of STORES) tx.objectStore(s).clear(); await done(tx); }
export async function bulkPut(batch: Partial<Record<StoreName, unknown[]>>) {
  const names = Object.keys(batch) as StoreName[];
  const tx = (await open()).transaction(names, 'readwrite');
  for (const n of names) for (const v of batch[n]!) tx.objectStore(n).put(v);
  await done(tx);
}
