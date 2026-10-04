// DERIVED, descriptive-only statistics. Never written back into raw records.
// Wording rule: "recorded", "observed association: k/n" - never "caused by".
import { ACNE_LOCATIONS, type Cycle, type DailyLog, type Data, type Product, type SkinMetric } from './types';
import { cycleDayFor, sortedCycles, summarize } from './cycle';
import { addDays, plural } from './util';

export interface Pattern { id: string; kind: string; text: string; sample_size: number; detail?: Record<string, unknown> }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const cycleOf = (date: string, cycles: Cycle[]) => sortedCycles(cycles).filter((c) => c.start_date <= date).at(-1);

type Metric = { key: string; label: string; get: (l: DailyLog) => number | undefined };
const metric = (m: SkinMetric): Metric => ({ key: m, label: m, get: (l) => l.skin[m] });
const ACNE: Metric = { key: 'acne', label: 'acne', get: (l) => l.skin.acne?.level };
export const PRODUCT_METRICS: Metric[] = [metric('irritation'), metric('redness'), ACNE];

export function computePatterns(d: Data): Pattern[] {
  const out: Pattern[] = [];
  const sum = summarize(d.cycles);

  // --- cycle length variation ---
  const lens = sum.map((s) => s.length_days).filter((x): x is number => x !== null);
  if (lens.length >= 2) {
    out.push({ id: 'cycle_length_range', kind: 'cycle', sample_size: lens.length,
      text: `Cycle length varied from ${Math.min(...lens)}–${Math.max(...lens)} days across ${plural(lens.length, 'recorded cycle')}.`,
      detail: { min: Math.min(...lens), max: Math.max(...lens), lengths: lens } });
  }

  // --- acne by location across cycles ---
  const recent = sortedCycles(d.cycles).slice(-8);
  const cycleHasLogs = (c: Cycle) => d.logs.some((l) => cycleOf(l.date, d.cycles)?.id === c.id);
  const denomCycles = recent.filter(cycleHasLogs);
  const targets = ['any', ...ACNE_LOCATIONS];
  for (const loc of targets) {
    const hits = d.logs.filter((l) => (l.skin.acne?.level ?? 0) > 0 && (loc === 'any' || l.skin.acne!.locations.includes(loc)));
    const label = loc === 'any' ? 'Acne' : `${cap(loc)} acne`;
    if (!hits.length) continue;
    if (denomCycles.length) {
      const k = denomCycles.filter((c) => hits.some((l) => cycleOf(l.date, d.cycles)?.id === c.id)).length;
      if (k) out.push({ id: `acne_${loc}_cycles`, kind: 'acne_location', sample_size: denomCycles.length, text: `${label} was recorded in ${k} of the last ${plural(denomCycles.length, 'cycle')} with entries.`, detail: { cycles_with: k } });
    }
    const cds = hits.map((l) => cycleDayFor(l.date, d.cycles)).filter((x): x is number => x !== null);
    if (cds.length >= 3) {
      let best = { start: 0, n: 0 };
      for (let s = 1; s <= 40; s++) { const n = cds.filter((c) => c >= s && c < s + 4).length; if (n > best.n) best = { start: s, n }; }
      const lo = best.start, hi = best.start + 3;
      const cyclesInWindow = new Set(d.logs.filter((l) => { const c = cycleDayFor(l.date, d.cycles); return c !== null && c >= lo && c <= hi; }).map((l) => cycleOf(l.date, d.cycles)?.id));
      const cyclesHit = new Set(hits.filter((l) => { const c = cycleDayFor(l.date, d.cycles)!; return c >= lo && c <= hi; }).map((l) => cycleOf(l.date, d.cycles)?.id));
      out.push({ id: `acne_${loc}_cd_window`, kind: 'acne_cycle_day', sample_size: cds.length,
        text: `${label} was most frequently recorded on cycle days ${lo}–${hi} (${best.n} of ${plural(cds.length, 'entry').replace('entrys', 'entries')}; recorded in ${cyclesHit.size} of ${plural(cyclesInWindow.size, 'cycle')} with entries on those days).`,
        detail: { cd_from: lo, cd_to: hi, entries_in_window: best.n } });
    }
  }

  // --- general symptom frequency ---
  if (d.logs.length) {
    for (const s of d.symptoms) {
      const n = d.logs.filter((l) => l.symptoms.some((e) => e.symptom_id === s.id)).length;
      if (n) out.push({ id: `symptom_${s.id}_freq`, kind: 'symptom_frequency', sample_size: d.logs.length, text: `${s.label} was logged on ${n} of ${plural(d.logs.length, 'logged day')}.`, detail: { days: n } });
    }
  }

  // --- product exposure -> next-day change (observed association only) ---
  const byDate = new Map(d.logs.map((l) => [l.date, l]));
  for (const p of d.products) {
    const usedDates = new Set(d.usage.filter((u) => u.product_id === p.id).map((u) => u.date));
    if (!usedDates.size) continue;
    out.push(...productPatterns(p, usedDates, byDate));
  }
  return out;
}

function productPatterns(p: Product, used: Set<string>, byDate: Map<string, DailyLog>): Pattern[] {
  const res: Pattern[] = [];
  for (const m of PRODUCT_METRICS) {
    const tally = (pred: (date: string) => boolean) => {
      let n = 0, up = 0;
      for (const [date, l] of byDate) {
        if (!pred(date)) continue;
        const next = byDate.get(addDays(date, 1));
        const a = m.get(l), b = next ? m.get(next) : undefined;
        if (a === undefined || b === undefined) continue;
        n++; if (b > a) up++;
      }
      return { n, up };
    };
    const w = tally((x) => used.has(x));
    if (!w.n) continue;
    const wo = tally((x) => !used.has(x));
    res.push({
      id: `product_${p.id}_${m.key}_next_day`, kind: 'product_next_day', sample_size: w.n,
      text: `${p.name}: recorded on ${plural(used.size, 'day')}; ${plural(w.n, 'of them')} had ${m.label} logged on both that day and the next. Next-day ${m.label} was higher on ${w.up}/${w.n} (observed association, not a conclusion).` +
        (wo.n ? ` For comparison, on days without it: ${wo.up}/${wo.n}.` : ''),
      detail: { with_product: w, without_product: wo, product_id: p.id, metric: m.key },
    });
  }
  return res;
}
