import { useSyncExternalStore } from 'react';
import * as db from './db';
import { DEFAULT_SYMPTOMS, type Cycle, type Data, type DailyLog, type Observation, type PhotoMeta, type Product, type ProductUsage, type SymptomDef } from './types';
import { sortedCycles } from './cycle';
import { uid } from './util';

const empty = (): Data => ({
  profile: { id: 'profile_main', created_at: new Date().toISOString() },
  cycles: [], logs: [], products: [], usage: [], symptoms: [], photos: [], observations: [],
});

let state: Data = empty();
let ready = false;
const subs = new Set<() => void>();
let snapshot = { data: state, ready };
const emit = () => { snapshot = { data: state, ready }; subs.forEach((f) => f()); };
const set = (patch: Partial<Data>) => { state = { ...state, ...patch }; emit(); };

export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snapshot);
export const getData = () => state;

const seedSymptoms = (): SymptomDef[] => DEFAULT_SYMPTOMS.map(([k, label]) => ({ id: `sym_${k}`, label, builtin: true, enabled: true }));

export async function init() {
  const [profile, cycles, logs, products, usage, symptoms, photos, observations] = await Promise.all([
    db.get<Data['profile']>('meta', 'profile_main'), db.getAll<Cycle>('cycles'), db.getAll<DailyLog>('logs'),
    db.getAll<Product>('products'), db.getAll<ProductUsage>('usage'), db.getAll<SymptomDef>('symptoms'),
    db.getAll<PhotoMeta>('photos'), db.getAll<Observation>('observations'),
  ]);
  const p = profile ?? empty().profile;
  if (!profile) await db.put('meta', p);
  let syms = symptoms;
  if (!syms.length) { syms = seedSymptoms(); await db.bulkPut({ symptoms: syms }); }
  state = { profile: p, cycles, logs, products, usage, symptoms: syms, photos, observations };
  ready = true; emit();
}

// ---------- daily logs ----------
export const logFor = (date: string) => state.logs.find((l) => l.date === date);

function blankLog(date: string): DailyLog {
  const now = new Date().toISOString();
  return { id: uid('log'), date, skin: {}, symptoms: [], cycle: {}, lifestyle: {}, created_at: now, updated_at: now };
}
/** Create-on-first-change so merely opening a date never writes an empty entry. */
export function updateLog(date: string, fn: (l: DailyLog) => DailyLog): DailyLog {
  const cur = logFor(date) ?? blankLog(date);
  const next = { ...fn(cur), id: cur.id, date, updated_at: new Date().toISOString() };
  set({ logs: state.logs.some((l) => l.id === next.id) ? state.logs.map((l) => (l.id === next.id ? next : l)) : [...state.logs, next] });
  void db.put('logs', next);
  return next;
}
export function deleteLog(date: string) {
  const l = logFor(date); if (!l) return;
  const usage = state.usage.filter((u) => u.daily_log_id === l.id);
  const photos = state.photos.filter((p) => p.daily_log_id === l.id);
  set({ logs: state.logs.filter((x) => x.id !== l.id), usage: state.usage.filter((u) => u.daily_log_id !== l.id), photos: state.photos.filter((p) => p.daily_log_id !== l.id) });
  void db.del('logs', l.id); usage.forEach((u) => db.del('usage', u.id));
  photos.forEach((p) => { void db.del('photos', p.id); void db.del('photo_blobs', p.id); });
}

// ---------- cycles (source of truth for period dates) ----------
function saveCycle(c: Cycle) {
  set({ cycles: state.cycles.some((x) => x.id === c.id) ? state.cycles.map((x) => (x.id === c.id ? c : x)) : [...state.cycles, c] });
  void db.put('cycles', c);
}
export const addCycle = (start_date: string, period_end_date?: string) => {
  const ex = state.cycles.find((c) => c.start_date === start_date);
  saveCycle(ex ? { ...ex, period_end_date: period_end_date ?? ex.period_end_date } : { id: uid('cyc'), start_date, period_end_date });
};
export const editCycle = (c: Cycle) => saveCycle(c);
export function removeCycle(id: string) { set({ cycles: state.cycles.filter((c) => c.id !== id) }); void db.del('cycles', id); }
export const isPeriodStart = (d: string) => state.cycles.some((c) => c.start_date === d);
export const isPeriodEnd = (d: string) => state.cycles.some((c) => c.period_end_date === d);
export function togglePeriodStart(d: string) {
  const ex = state.cycles.find((c) => c.start_date === d);
  if (ex) removeCycle(ex.id); else addCycle(d);
}
/** "Period ended today" attaches to the latest period that began on/before today. */
export function togglePeriodEnd(d: string) {
  const ex = state.cycles.find((c) => c.period_end_date === d);
  if (ex) { saveCycle({ ...ex, period_end_date: undefined }); return; }
  const cur = sortedCycles(state.cycles).filter((c) => c.start_date <= d).at(-1);
  if (cur) saveCycle({ ...cur, period_end_date: d });
}

// ---------- products & usage ----------
export function saveProduct(p: Product) {
  set({ products: state.products.some((x) => x.id === p.id) ? state.products.map((x) => (x.id === p.id ? p : x)) : [...state.products, p] });
  void db.put('products', p);
}
export const newProduct = (): Product => ({ id: uid('prod'), name: '', brand: '', category: 'other', active_ingredients: [], notes: '', enabled: true });

export const usageFor = (date: string) => state.usage.filter((u) => u.date === date);
export function toggleUsage(date: string, product_id: string, slot: 'am' | 'pm') {
  const ex = state.usage.find((u) => u.date === date && u.product_id === product_id && u.slot === slot);
  if (ex) { set({ usage: state.usage.filter((u) => u.id !== ex.id) }); void db.del('usage', ex.id); return; }
  const log = state.logs.find((l) => l.date === date) ?? updateLog(date, (l) => l);
  const u: ProductUsage = { id: uid('use'), daily_log_id: log.id, date, product_id, slot };
  set({ usage: [...state.usage, u] }); void db.put('usage', u);
}
export function patchUsage(id: string, patch: Partial<ProductUsage>) {
  const u = state.usage.find((x) => x.id === id); if (!u) return;
  const n = { ...u, ...patch };
  set({ usage: state.usage.map((x) => (x.id === id ? n : x)) }); void db.put('usage', n);
}

// ---------- symptoms ----------
export function addCustomSymptom(label: string): SymptomDef | null {
  const l = label.trim(); if (!l) return null;
  const ex = state.symptoms.find((s) => s.label.toLowerCase() === l.toLowerCase());
  if (ex) return ex;
  const s: SymptomDef = { id: uid('sym'), label: l, builtin: false, enabled: true };
  set({ symptoms: [...state.symptoms, s] }); void db.put('symptoms', s); return s;
}
export function setSymptomEnabled(id: string, enabled: boolean) {
  const s = state.symptoms.find((x) => x.id === id); if (!s) return;
  const n = { ...s, enabled }; set({ symptoms: state.symptoms.map((x) => (x.id === id ? n : x)) }); void db.put('symptoms', n);
}

// ---------- photos ----------
export async function addPhoto(date: string, angle: string, blob: Blob) {
  const log = state.logs.find((l) => l.date === date) ?? updateLog(date, (l) => l);
  const meta: PhotoMeta = { id: uid('photo'), daily_log_id: log.id, date, timestamp: new Date().toISOString(), angle, mime: blob.type || 'image/jpeg' };
  await db.put('photo_blobs', { id: meta.id, blob }); await db.put('photos', meta);
  set({ photos: [...state.photos, meta] });
}
export async function removePhoto(id: string) { set({ photos: state.photos.filter((p) => p.id !== id) }); await db.del('photos', id); await db.del('photo_blobs', id); }
export async function photoBlob(id: string): Promise<Blob | undefined> { return (await db.get<{ id: string; blob: Blob }>('photo_blobs', id))?.blob; }

// ---------- observations ----------
export function saveObservation(o: Observation) {
  set({ observations: state.observations.some((x) => x.id === o.id) ? state.observations.map((x) => (x.id === o.id ? o : x)) : [...state.observations, o] });
  void db.put('observations', o);
}
export function removeObservation(id: string) { set({ observations: state.observations.filter((o) => o.id !== id) }); void db.del('observations', id); }

// ---------- bulk ----------
export async function replaceAll(d: Data, blobs: { id: string; blob: Blob }[] = []) {
  await db.clearAll();
  const symptoms = d.symptoms.length ? d.symptoms : seedSymptoms();
  await db.bulkPut({ meta: [d.profile], logs: d.logs, cycles: d.cycles, products: d.products, usage: d.usage, symptoms, photos: d.photos, observations: d.observations, photo_blobs: blobs });
  state = { ...d, symptoms }; emit();
}
export async function wipeAll() { await db.clearAll(); const e = empty(); await db.put('meta', e.profile); await db.bulkPut({ symptoms: seedSymptoms() }); state = { ...e, symptoms: seedSymptoms() }; emit(); }
