import { useState } from 'react';
import { removeObservation, saveObservation, useStore } from '../store';
import { SKIN_METRICS, type Observation, type ObservationKind, type Sev } from '../types';
import { Back, Card, Chip, Field, Sev3 } from '../ui';
import { fmtShort, todayISO, uid } from '../util';

export const KIND_LABEL: Record<ObservationKind, string> = {
  observed_event: 'Observed event', user_hypothesis: 'My hypothesis', confirmed_medical: 'Confirmed medical info',
};
const KIND_HELP: Record<ObservationKind, string> = {
  observed_event: 'What I saw. No cause implied.', user_hypothesis: 'My own guess. Not a finding.', confirmed_medical: 'Told to me by a clinician.',
};
const blank = (): Observation => ({ id: uid('obs'), date: todayISO(), kind: 'observed_event', window: 'next_day', observed: {}, text: '', created_at: new Date().toISOString() });

export function Observations() {
  const { data: d } = useStore();
  const [o, setO] = useState<Observation | null>(null);
  const name = (id?: string) => d.products.find((p) => p.id === id)?.name;
  if (o) {
    const setM = (m: string, v: Sev | undefined) => { const obs = { ...o.observed } as Record<string, Sev>; if (v === undefined) delete obs[m]; else obs[m] = v; setO({ ...o, observed: obs }); };
    return (
      <>
        <Back to="more/observations" label="Observations" />
        <h1>Observation</h1>
        <Card>
          <Field label="Type"><div className="chips">{(Object.keys(KIND_LABEL) as ObservationKind[]).map((k) => <Chip key={k} small on={o.kind === k} tone={k === 'user_hypothesis' ? 'sun' : undefined} onClick={() => setO({ ...o, kind: k })}>{KIND_LABEL[k]}</Chip>)}</div><div className="sub" style={{ marginTop: 4 }}>{KIND_HELP[o.kind]}</div></Field>
          <Field label="Date"><input type="date" value={o.date} onChange={(e) => setO({ ...o, date: e.target.value })} /></Field>
          <Field label="Product / device (optional)">
            <select value={o.product_id ?? ''} onChange={(e) => setO({ ...o, product_id: e.target.value || undefined })}>
              <option value="">None</option>{d.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Noticed…"><div className="chips">{([['same_day', 'same day'], ['next_day', 'next day'], ['few_days', 'within a few days']] as const).map(([k, l]) => <Chip key={k} small on={o.window === k} onClick={() => setO({ ...o, window: k })}>{l}</Chip>)}</div></Field>
          {['acne', ...SKIN_METRICS].map((m) => <Field key={m} label={m[0].toUpperCase() + m.slice(1)}><Sev3 value={(o.observed as Record<string, number>)[m]} onChange={(v) => setM(m, v)} /></Field>)}
          <Field label="Notes"><textarea value={o.text} onChange={(e) => setO({ ...o, text: e.target.value })} placeholder="In your own words" /></Field>
        </Card>
        <div className="row"><button className="btn grow" onClick={() => setO(null)}>Cancel</button><button className="btn primary grow" onClick={() => { saveObservation(o); setO(null); }}>Save</button></div>
      </>
    );
  }
  const list = [...d.observations].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <Back to="more" />
      <h1>Observations</h1>
      <div className="sub" style={{ marginBottom: 10 }}>“After using X, I noticed Y” – stored as an observation, never as a proven cause.</div>
      <button className="cta" style={{ minHeight: 52, fontSize: 17 }} onClick={() => setO(blank())}>＋ Add observation</button>
      <div style={{ height: 12 }} />
      {list.map((x) => (
        <Card key={x.id}>
          <div className="row sp"><b>{fmtShort(x.date)}</b><span className={`pill ${x.kind === 'user_hypothesis' ? '' : 'p'}`}>{KIND_LABEL[x.kind]}</span></div>
          {x.product_id && <div className="sub">{x.kind === 'user_hypothesis' ? 'My hypothesis involving' : 'Product recorded:'} {name(x.product_id) ?? '(deleted)'} · noticed {x.window.replace('_', ' ')}</div>}
          <div>{Object.entries(x.observed).map(([m, v]) => <span key={m} className="pill">{m} {v}/3</span>)}</div>
          {x.text && <div>{x.text}</div>}
          <div className="row" style={{ marginTop: 8 }}><button className="btn sm" onClick={() => setO(x)}>Edit</button><button className="btn sm danger" onClick={() => confirm('Delete?') && removeObservation(x.id)}>Delete</button></div>
        </Card>
      ))}
    </>
  );
}
