import { useMemo, useState } from 'react';
import { cycleDayFor } from '../cycle';
import { useStore } from '../store';
import { ACNE_LOCATIONS, SKIN_METRICS, type DailyLog, type Data } from '../types';
import { Card, Chip, Field } from '../ui';
import { DayCard } from './DayCard';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function hasSymptom(l: DailyLog, key: string, d: Data): boolean {
  if (key === 'acne') return (l.skin.acne?.level ?? 0) > 0;
  if (key.startsWith('acne:')) return (l.skin.acne?.level ?? 0) > 0 && l.skin.acne!.locations.includes(key.slice(5));
  if (key.startsWith('skin:')) return ((l.skin as Record<string, any>)[key.slice(5)] ?? 0) > 0;
  if (key === 'period') return d.cycles.some((c) => c.start_date === l.date);
  return l.symptoms.some((s) => s.symptom_id === key);
}

export function Timeline() {
  const { data: d } = useStore();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ from: '', to: '', cdFrom: '', cdTo: '', symptom: '', product: '' });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });

  const rows = useMemo(() => [...d.logs].sort((a, b) => b.date.localeCompare(a.date)).filter((l) => {
    if (f.from && l.date < f.from) return false;
    if (f.to && l.date > f.to) return false;
    if (f.cdFrom || f.cdTo) {
      const cd = cycleDayFor(l.date, d.cycles);
      if (cd === null || (f.cdFrom && cd < +f.cdFrom) || (f.cdTo && cd > +f.cdTo)) return false;
    }
    if (f.symptom && !hasSymptom(l, f.symptom, d)) return false;
    if (f.product && !d.usage.some((u) => u.daily_log_id === l.id && u.product_id === f.product)) return false;
    return true;
  }), [d, f]);
  const active = Object.values(f).some(Boolean);

  return (
    <>
      <h1>Timeline</h1>
      <div className="row sp" style={{ marginBottom: 10 }}>
        <span className="sub">{rows.length} of {d.logs.length} days{active ? ' (filtered)' : ''}</span>
        <div className="row">
          {active && <button className="btn sm" onClick={() => setF({ from: '', to: '', cdFrom: '', cdTo: '', symptom: '', product: '' })}>Clear</button>}
          <Chip small on={open || active} onClick={() => setOpen(!open)}>Filter</Chip>
        </div>
      </div>
      {open && (
        <Card>
          <div className="row">
            <Field label="From"><input type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} /></Field>
            <Field label="To"><input type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} /></Field>
          </div>
          <div className="row">
            <Field label="Cycle day from"><input type="number" inputMode="numeric" min={1} value={f.cdFrom} onChange={(e) => set({ cdFrom: e.target.value })} /></Field>
            <Field label="to"><input type="number" inputMode="numeric" min={1} value={f.cdTo} onChange={(e) => set({ cdTo: e.target.value })} /></Field>
          </div>
          <Field label="Symptom">
            <select value={f.symptom} onChange={(e) => set({ symptom: e.target.value })}>
              <option value="">Any</option>
              <optgroup label="Skin">
                <option value="acne">Acne (any)</option>
                {ACNE_LOCATIONS.map((l) => <option key={l} value={`acne:${l}`}>{cap(l)} acne</option>)}
                {SKIN_METRICS.map((m) => <option key={m} value={`skin:${m}`}>{cap(m)} (≥1)</option>)}
              </optgroup>
              <optgroup label="Cycle"><option value="period">Period start</option></optgroup>
              <optgroup label="Other">{d.symptoms.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
            </select>
          </Field>
          <Field label="Product / device used">
            <select value={f.product} onChange={(e) => set({ product: e.target.value })}>
              <option value="">Any</option>
              {d.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </Card>
      )}
      {rows.length === 0 ? <Card><span className="sub">{d.logs.length ? 'No days match these filters.' : 'No entries yet.'}</span></Card>
        : <div className="tl">{rows.map((l) => <DayCard key={l.id} log={l} d={d} />)}</div>}
    </>
  );
}
