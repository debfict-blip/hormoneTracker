import { useState } from 'react';
import { computePatterns } from '../analytics';
import { cycleDayFor, predictNext, summarize } from '../cycle';
import { addCycle, editCycle, removeCycle, useStore } from '../store';
import { Card, Field } from '../ui';
import { diffDays, fmtShort, plural, todayISO, addDays } from '../util';
import type { Cycle } from '../types';

export function CycleView() {
  const { data: d } = useStore();
  const today = todayISO();
  const sums = summarize(d.cycles).reverse();
  const pred = predictNext(d.cycles, today);
  const notes = computePatterns(d).filter((p) => p.kind === 'cycle' || p.id === 'acne_any_cd_window' || p.id === 'acne_any_cycles');
  const [editing, setEditing] = useState<Cycle | null>(null);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  return (
    <>
      <h1>Cycles</h1>
      <div className="sub" style={{ marginBottom: 10 }}>Built from the period dates you record. Edit anything that looks off.</div>

      {notes.length > 0 && <Card>{notes.map((p) => <div key={p.id} style={{ marginBottom: 6 }}>{p.text}</div>)}<div className="sub">Descriptive only. Not a medical assessment.</div></Card>}
      {pred && <Card><span className="sub">Estimated next period start:</span> <b>{fmtShort(pred.date)}</b> <span className="sub">(mean of {plural(pred.n, 'recorded cycle')}: {pred.avg_len} d, range {pred.min_len}–{pred.max_len})</span></Card>}

      <Card>
        <h3>Add a past period</h3>
        <Field label="Started"><input type="date" max={today} value={newStart} onChange={(e) => setNewStart(e.target.value)} /></Field>
        <Field label="Ended (optional)"><input type="date" max={today} min={newStart || undefined} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></Field>
        <button className="btn primary block" disabled={!newStart || (!!newEnd && newEnd < newStart)} onClick={() => { addCycle(newStart, newEnd || undefined); setNewStart(''); setNewEnd(''); }}>Add period</button>
      </Card>

      {sums.length === 0 && <Card><span className="sub">No periods recorded yet. Use “Period started” in the Log tab, or add a date above.</span></Card>}
      {sums.map(({ cycle: c, length_days, period_days, end_date }) => {
        const days = d.logs.filter((l) => l.date >= c.start_date && (!end_date || l.date <= end_date));
        const span = length_days ?? Math.max(1, diffDays(today, c.start_date) + 1);
        const spotting = days.filter((l) => l.cycle.spotting).length;
        const cells = Array.from({ length: Math.min(span, 60) }, (_, i) => {
          const date = addDays(c.start_date, i);
          const l = d.logs.find((x) => x.date === date);
          const lvl = l?.skin.acne?.level;
          return { cd: i + 1, l, lvl, period: c.period_end_date ? date <= c.period_end_date : i < 1 };
        });
        const symCounts = new Map<string, number[]>();
        for (const l of days) for (const s of l.symptoms) { const n = d.symptoms.find((x) => x.id === s.symptom_id)?.label ?? s.symptom_id; symCounts.set(n, [...(symCounts.get(n) ?? []), cycleDayFor(l.date, d.cycles) ?? 0]); }
        return (
          <Card key={c.id}>
            <div className="row sp">
              <b>{fmtShort(c.start_date)}{end_date ? ` → ${fmtShort(end_date)}` : ' → now'}</b>
              <button className="btn sm" onClick={() => setEditing(c)}>Edit</button>
            </div>
            <div className="sub" style={{ margin: '2px 0 8px' }}>
              {length_days ? `${length_days}-day cycle` : `in progress (CD ${span})`} · period {period_days ? plural(period_days, 'day') : 'end not recorded'} · {plural(days.length, 'logged day')}{spotting ? ` · spotting ${plural(spotting, 'day')}` : ''}
            </div>
            <div className="strip" aria-label="Acne by cycle day">
              {cells.map((x) => <div key={x.cd} className={`cell ${x.lvl !== undefined ? 'has s' + x.lvl : ''} ${x.period ? 'pd' : ''}`} title={`CD ${x.cd}`}>{x.cd}</div>)}
            </div>
            <div className="sub" style={{ fontSize: 11, marginTop: 4 }}>Colour = acne level that day (grey = none/not logged). Orange base = period days.</div>
            {symCounts.size > 0 && <div style={{ marginTop: 8 }}>{[...symCounts].map(([n, cds]) => <span key={n} className="pill l">{n} · CD {cds.join(', ')}</span>)}</div>}
          </Card>
        );
      })}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 30, display: 'flex', alignItems: 'flex-end' }} onClick={() => setEditing(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 560, margin: '0 auto', borderRadius: '22px 22px 0 0', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
            <h3>Edit period</h3>
            <Field label="Period start"><input type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} /></Field>
            <Field label="Period end (optional)"><input type="date" value={editing.period_end_date ?? ''} onChange={(e) => setEditing({ ...editing, period_end_date: e.target.value || undefined })} /></Field>
            <div className="row">
              <button className="btn danger" onClick={() => { if (confirm('Delete this period record?')) { removeCycle(editing.id); setEditing(null); } }}>Delete</button>
              <div className="grow" />
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" disabled={!editing.start_date || (!!editing.period_end_date && editing.period_end_date < editing.start_date)} onClick={() => { editCycle(editing); setEditing(null); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
