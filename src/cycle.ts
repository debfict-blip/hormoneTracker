import type { Cycle } from './types';
import { addDays, diffDays, mean } from './util';

const MAX_CD = 90; // beyond this we don't claim a cycle day

export const sortedCycles = (cycles: Cycle[]) => [...cycles].sort((a, b) => a.start_date.localeCompare(b.start_date));

/** Cycle day = days since the latest recorded period start (CD1 = start day). Derived, never stored. */
export function cycleDayFor(date: string, cycles: Cycle[]): number | null {
  let best: Cycle | null = null;
  for (const c of cycles) if (c.start_date <= date && (!best || c.start_date > best.start_date)) best = c;
  if (!best) return null;
  const cd = diffDays(date, best.start_date) + 1;
  return cd > MAX_CD ? null : cd;
}

export interface CycleSummary {
  cycle: Cycle; length_days: number | null; /* null for the in-progress cycle */
  period_days: number | null; end_date: string | null;
}
export function summarize(cycles: Cycle[]): CycleSummary[] {
  const s = sortedCycles(cycles);
  return s.map((c, i) => {
    const next = s[i + 1];
    return {
      cycle: c,
      length_days: next ? diffDays(next.start_date, c.start_date) : null,
      period_days: c.period_end_date ? diffDays(c.period_end_date, c.start_date) + 1 : null,
      end_date: next ? addDays(next.start_date, -1) : null,
    };
  });
}

export interface Prediction { date: string; days_until: number; min_len: number; max_len: number; avg_len: number; n: number }
/** Estimate from the mean of up to the last 6 recorded lengths. Not a fixed 28 days; null without data. */
export function predictNext(cycles: Cycle[], today: string): Prediction | null {
  const lens = summarize(cycles).map((s) => s.length_days).filter((x): x is number => x !== null).slice(-6);
  if (!lens.length) return null;
  const last = sortedCycles(cycles).at(-1)!;
  const avg = Math.round(mean(lens));
  const date = addDays(last.start_date, avg);
  return { date, days_until: diffDays(date, today), min_len: Math.min(...lens), max_len: Math.max(...lens), avg_len: avg, n: lens.length };
}
