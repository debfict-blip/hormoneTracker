import { computePatterns, type Pattern } from './analytics';
import { cycleDayFor, summarize } from './cycle';
import { photoBlob } from './store';
import { SCHEMA_VERSION, SKIN_METRICS, type Cycle, type Data, type DailyLog, type Observation, type PhotoMeta, type Product, type ProductUsage, type Profile, type SymptomDef } from './types';
import { isISO } from './util';

export interface ExportBundle {
  schema_version: string;
  exported_at: string;
  app: string;
  conventions: Record<string, string>;
  profile: Profile;
  cycles: Cycle[];
  daily_logs: Record<string, unknown>[];
  products: Product[];
  product_usage: ProductUsage[];
  symptoms: SymptomDef[];
  photos: (PhotoMeta & { data_url?: string })[];
  observations: Observation[];
  /** DERIVED. Recomputed from the raw sections above; ignored on import. */
  derived: { generated_at: string; cycle_summaries: unknown[]; patterns: Pattern[] };
}

const CONVENTIONS = {
  missing_vs_zero: 'A field that is absent was not recorded. 0 means the user explicitly recorded "none".',
  severity_scale: '0=none, 1=mild, 2=moderate, 3=severe (acne: 0 none, 1 small, 2 moderate, 3 deep/painful).',
  cycle_day: 'Derived from recorded period start dates (CD1 = start day); null if no period start on/before the date within 90 days. Cycle lengths are never assumed to be 28 days.',
  observations: 'kind distinguishes observed_event (what the user saw), user_hypothesis (the user\'s own guess, not a finding) and confirmed_medical (info from a clinician). No causal link is implied unless kind is user_hypothesis.',
  product_usage: 'Records what was actually used, nothing about effects.',
  derived: 'The "derived" section is descriptive statistics computed from raw data. Raw sections are never modified by it.',
  not_medical_advice: 'Personal tracking data. Do not diagnose; do not infer hormonal/menopausal status; do not present correlation as causation.',
};

const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });

export function dailyLogView(l: DailyLog, d: Data) {
  const use = d.usage.filter((u) => u.daily_log_id === l.id);
  const prod = (id: string) => d.products.find((p) => p.id === id);
  const slot = (s: 'am' | 'pm') => use.filter((u) => u.slot === s).map((u) => ({ usage_id: u.id, product_id: u.product_id, product_name: prod(u.product_id)?.name ?? null, duration_min: u.duration_min ?? null, intensity: u.intensity ?? null }));
  return {
    id: l.id, date: l.date, cycle_day: cycleDayFor(l.date, d.cycles),
    cycle: { period_started: d.cycles.some((c) => c.start_date === l.date), period_ended: d.cycles.some((c) => c.period_end_date === l.date), ...l.cycle },
    skin: l.skin,
    symptoms: l.symptoms.map((s) => ({ symptom_id: s.symptom_id, label: d.symptoms.find((x) => x.id === s.symptom_id)?.label ?? null, severity: s.severity ?? null })),
    lifestyle: l.lifestyle,
    skincare: { am: slot('am'), pm: slot('pm') },
    notes: l.notes ?? '',
    photo_ids: d.photos.filter((p) => p.daily_log_id === l.id).map((p) => p.id),
    created_at: l.created_at, updated_at: l.updated_at,
  };
}

export async function buildExport(d: Data, opts: { photoData?: boolean } = {}): Promise<ExportBundle> {
  const logs = [...d.logs].sort((a, b) => a.date.localeCompare(b.date));
  const photos = await Promise.all([...d.photos].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map(async (p) => {
    if (!opts.photoData) return p;
    const b = await photoBlob(p.id);
    return b ? { ...p, data_url: await blobToDataUrl(b) } : p;
  }));
  const now = new Date().toISOString();
  return {
    schema_version: SCHEMA_VERSION, exported_at: now, app: 'skin-cycle-tracker', conventions: CONVENTIONS,
    profile: d.profile,
    cycles: [...d.cycles].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    daily_logs: logs.map((l) => dailyLogView(l, d)),
    products: d.products, product_usage: [...d.usage].sort((a, b) => a.date.localeCompare(b.date)),
    symptoms: d.symptoms, photos, observations: d.observations,
    derived: {
      generated_at: now,
      cycle_summaries: summarize(d.cycles).map((s) => ({ cycle_id: s.cycle.id, start_date: s.cycle.start_date, length_days: s.length_days, period_days: s.period_days })),
      patterns: computePatterns(d),
    },
  };
}

// ---------- CSV ----------
const q = (v: unknown) => { const s = v === undefined || v === null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const row = (xs: unknown[]) => xs.map(q).join(',');

export function dailyCsv(d: Data): string {
  const head = ['date', 'cycle_day', 'period_started', 'period_ended', 'spotting', 'ovulation_sign', 'pms_symptoms', 'acne_level', 'acne_locations', ...SKIN_METRICS,
    'symptoms', 'sleep_hours', 'sleep_quality', 'stress', 'exercise', 'caffeine_cups', 'alcohol_drinks', 'am_products', 'pm_products', 'notes', 'log_id'];
  const lines = [row(head)];
  for (const l of [...d.logs].sort((a, b) => a.date.localeCompare(b.date))) {
    const v = dailyLogView(l, d);
    const names = (s: { product_name: string | null }[]) => s.map((x) => x.product_name).join('; ');
    lines.push(row([l.date, v.cycle_day, v.cycle.period_started, v.cycle.period_ended, l.cycle.spotting, l.cycle.ovulation_sign, l.cycle.pms_symptoms,
      l.skin.acne?.level, l.skin.acne?.locations.join('; '), ...SKIN_METRICS.map((m) => l.skin[m]),
      v.symptoms.map((s) => (s.severity === null ? s.label : `${s.label}:${s.severity}`)).join('; '),
      l.lifestyle.sleep_hours, l.lifestyle.sleep_quality, l.lifestyle.stress, l.lifestyle.exercise, l.lifestyle.caffeine_cups, l.lifestyle.alcohol_drinks,
      names(v.skincare.am), names(v.skincare.pm), l.notes, l.id]));
  }
  return lines.join('\n');
}
export function usageCsv(d: Data): string {
  const lines = [row(['date', 'slot', 'product_name', 'brand', 'category', 'duration_min', 'intensity', 'product_id', 'daily_log_id'])];
  for (const u of [...d.usage].sort((a, b) => a.date.localeCompare(b.date))) {
    const p = d.products.find((x) => x.id === u.product_id);
    lines.push(row([u.date, u.slot, p?.name, p?.brand, p?.category, u.duration_min, u.intensity, u.product_id, u.daily_log_id]));
  }
  return lines.join('\n');
}

// ---------- download ----------
export async function saveFile(name: string, mime: string, content: string | Blob) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const file = new File([blob], name, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && /iPhone|iPad/.test(navigator.userAgent)) {
    try { await nav.share({ files: [file], title: name }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export const stamp = () => new Date().toISOString().slice(0, 10);

// ---------- import / validation / migration ----------
/** Each entry upgrades a bundle FROM that version to the next. Add one when SCHEMA_VERSION changes. */
const MIGRATIONS: Record<string, { to: string; run: (b: Record<string, unknown>) => Record<string, unknown> }> = {
  // '0.1': { to: '0.2', run: (b) => ({ ...b, /* reshape */ }) },
};
export function migrate(b: Record<string, unknown>): Record<string, unknown> {
  let v = String(b.schema_version);
  let cur = b;
  while (v !== SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`Unsupported schema_version "${v}" (this app reads ${SCHEMA_VERSION}).`);
    cur = { ...m.run(cur), schema_version: m.to }; v = m.to;
  }
  return cur;
}

const isObj = (x: unknown): x is Record<string, any> => typeof x === 'object' && x !== null && !Array.isArray(x);
export function parseImport(text: string): { data: Data; blobs: { id: string; blob: Blob }[]; warnings: string[] } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('File is not valid JSON.'); }
  if (!isObj(raw)) throw new Error('Expected a JSON object.');
  if (typeof raw.schema_version !== 'string') throw new Error('Missing schema_version.');
  const b = migrate(raw);
  const errs: string[] = [];
  const arr = (k: string): any[] => { const v = b[k]; if (!Array.isArray(v)) { errs.push(`"${k}" must be an array`); return []; } return v; };
  const cycles = arr('cycles'), logs = arr('daily_logs'), products = arr('products'), usage = arr('product_usage'),
    symptoms = arr('symptoms'), photos = arr('photos'), observations = arr('observations');
  const chk = (name: string, list: any[], test: (x: any) => boolean) => list.forEach((x, i) => { if (!isObj(x) || typeof x.id !== 'string' || !test(x)) errs.push(`${name}[${i}] is malformed`); });
  chk('cycles', cycles, (c) => isISO(c.start_date));
  chk('daily_logs', logs, (l) => isISO(l.date));
  chk('products', products, (p) => typeof p.name === 'string');
  chk('product_usage', usage, (u) => isISO(u.date) && typeof u.product_id === 'string' && (u.slot === 'am' || u.slot === 'pm'));
  chk('symptoms', symptoms, (s) => typeof s.label === 'string');
  chk('photos', photos, (p) => isISO(p.date));
  chk('observations', observations, (o) => isISO(o.date));
  if (new Set(logs.map((l) => l.date)).size !== logs.length) errs.push('daily_logs has duplicate dates');
  if (errs.length) throw new Error(errs.slice(0, 6).join('\n') + (errs.length > 6 ? `\n…and ${errs.length - 6} more` : ''));

  const warnings: string[] = [];
  const blobs: { id: string; blob: Blob }[] = [];
  const photoMetas: PhotoMeta[] = photos.map((p) => {
    const { data_url, ...meta } = p;
    if (typeof data_url === 'string' && data_url.startsWith('data:')) blobs.push({ id: p.id, blob: dataUrlToBlob(data_url) });
    return meta as PhotoMeta;
  });
  const missing = photoMetas.filter((p) => !blobs.some((x) => x.id === p.id)).length;
  if (missing) warnings.push(`${missing} photo record(s) had no image data (export without photos) – metadata imported only.`);

  const data: Data = {
    profile: isObj(b.profile) && typeof b.profile.id === 'string' ? (b.profile as Profile) : { id: 'profile_main', created_at: new Date().toISOString() },
    cycles: cycles.map(({ id, start_date, period_end_date, notes }) => ({ id, start_date, period_end_date, notes })),
    logs: logs.map((l): DailyLog => ({
      id: l.id, date: l.date, skin: l.skin ?? {}, cycle: { spotting: l.cycle?.spotting, ovulation_sign: l.cycle?.ovulation_sign, pms_symptoms: l.cycle?.pms_symptoms },
      symptoms: (l.symptoms ?? []).map((s: any) => ({ symptom_id: s.symptom_id, severity: s.severity ?? undefined })),
      lifestyle: l.lifestyle ?? {}, notes: l.notes || undefined, created_at: l.created_at ?? new Date().toISOString(), updated_at: l.updated_at ?? new Date().toISOString(),
    })),
    products, usage: usage.map(({ id, daily_log_id, date, product_id, slot, duration_min, intensity }) => ({ id, daily_log_id, date, product_id, slot, duration_min: duration_min ?? undefined, intensity: intensity ?? undefined })),
    symptoms, photos: photoMetas, observations,
  };
  return { data, blobs, warnings };
}
function dataUrlToBlob(u: string): Blob {
  const [head, b64] = u.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
