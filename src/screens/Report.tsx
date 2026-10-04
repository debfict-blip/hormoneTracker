import { useEffect, useState } from 'react';
import { computePatterns } from '../analytics';
import { summarize } from '../cycle';
import { buildExport, dailyCsv, saveFile, stamp } from '../exporter';
import { getData, photoBlob, useStore } from '../store';
import { ACNE_LOCATIONS, SKIN_METRICS } from '../types';
import { Back, Card, Chip } from '../ui';
import { fmtShort, plural } from '../util';
import { KIND_LABEL } from './Observations';

function PhotoImg({ id }: { id: string }) {
  const [u, setU] = useState<string>();
  useEffect(() => { let url: string | undefined; void photoBlob(id).then((b) => { if (b) { url = URL.createObjectURL(b); setU(url); } }); return () => { if (url) URL.revokeObjectURL(url); }; }, [id]);
  return u ? <img className="photo" src={u} alt="" /> : <div className="photo" />;
}

export function Report() {
  const { data: d } = useStore();
  const [withPhotos, setWithPhotos] = useState(false);
  const logs = [...d.logs].sort((a, b) => a.date.localeCompare(b.date));
  const sums = summarize(d.cycles);
  const pats = computePatterns(d);
  const symCount = d.symptoms.map((s) => [s.label, logs.filter((l) => l.symptoms.some((e) => e.symptom_id === s.id)).length] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const acneDays = logs.filter((l) => (l.skin.acne?.level ?? 0) > 0);
  const exposure = d.products.map((p) => ({ p, days: new Set(d.usage.filter((u) => u.product_id === p.id).map((u) => u.date)).size })).filter((x) => x.days > 0);
  const notes = logs.filter((l) => l.notes);

  return (
    <>
      <div className="noprint">
        <Back to="more" />
        <div className="note">Personal tracking summary compiled from entries made by the patient. No AI interpretation or diagnosis is included.</div>
        <div className="row wrap" style={{ marginBottom: 12 }}>
          <button className="btn primary" onClick={() => window.print()}>Print / Save as PDF</button>
          <button className="btn" onClick={async () => saveFile(`doctor-summary-${stamp()}.json`, 'application/json', JSON.stringify(await buildExport(getData()), null, 2))}>JSON</button>
          <button className="btn" onClick={() => saveFile(`daily-logs-${stamp()}.csv`, 'text/csv', dailyCsv(getData()))}>CSV</button>
          <Chip small on={withPhotos} onClick={() => setWithPhotos(!withPhotos)}>Include photos</Chip>
        </div>
      </div>
      <h1>Skin & cycle summary</h1>
      <Card>
        <h3>Observation period</h3>
        {logs.length ? <>{fmtShort(logs[0].date)} {logs[0].date.slice(0, 4)} – {fmtShort(logs.at(-1)!.date)} {logs.at(-1)!.date.slice(0, 4)} · {plural(logs.length, 'logged day')}</> : 'No entries.'}
      </Card>
      <Card>
        <h3>Cycle history</h3>
        {sums.length === 0 ? 'No periods recorded.' : (
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left' }}><th>Start</th><th>Cycle length</th><th>Period</th><th>Spotting days</th></tr></thead>
            <tbody>{sums.map(({ cycle: c, length_days, period_days, end_date }) => (
              <tr key={c.id}><td>{c.start_date}</td><td>{length_days ? `${length_days} d` : 'ongoing'}</td><td>{period_days ? `${period_days} d` : 'end not recorded'}</td>
                <td>{logs.filter((l) => l.cycle.spotting && l.date >= c.start_date && (!end_date || l.date <= end_date)).length}</td></tr>))}</tbody>
          </table>
        )}
        {pats.filter((p) => p.kind === 'cycle').map((p) => <div key={p.id} style={{ marginTop: 6 }}>{p.text}</div>)}
      </Card>
      <Card>
        <h3>Main symptoms (days logged)</h3>
        {symCount.length ? symCount.map(([n, c]) => <span key={n} className="pill l">{n}: {c}</span>) : 'None recorded.'}
      </Card>
      <Card>
        <h3>Skin symptoms</h3>
        <div>Acne recorded on {acneDays.length} of {logs.length} logged days.</div>
        <div>{ACNE_LOCATIONS.map((loc) => { const n = acneDays.filter((l) => l.skin.acne!.locations.includes(loc)).length; return n ? <span key={loc} className="pill">{loc}: {n} d</span> : null; })}</div>
        <div>{SKIN_METRICS.map((m) => { const v = logs.filter((l) => l.skin[m] !== undefined); const hi = v.filter((l) => (l.skin[m] ?? 0) >= 2).length; return v.length ? <span key={m} className="pill">{m}: logged {v.length} d, ≥2/3 on {hi} d</span> : null; })}</div>
        {pats.filter((p) => p.kind.startsWith('acne')).map((p) => <div key={p.id} style={{ marginTop: 6 }}>{p.text} <span className="sub">(n={p.sample_size})</span></div>)}
      </Card>
      <Card>
        <h3>Product / device exposure (as recorded)</h3>
        {exposure.length ? exposure.map(({ p, days }) => <div key={p.id}>{p.name}{p.active_ingredients.length ? ` (${p.active_ingredients.join(', ')})` : ''}: used on {plural(days, 'day')}</div>) : 'None recorded.'}
      </Card>
      <Card>
        <h3>Observed reactions</h3>
        {pats.filter((p) => p.kind === 'product_next_day').map((p) => <div key={p.id} style={{ marginBottom: 6 }}>{p.text}</div>)}
        {d.observations.length === 0 && !pats.some((p) => p.kind === 'product_next_day') && 'None recorded.'}
        {[...d.observations].sort((a, b) => a.date.localeCompare(b.date)).map((o) => (
          <div key={o.id} style={{ marginTop: 6 }}><b>{o.date}</b> [{KIND_LABEL[o.kind]}] {o.product_id && `${d.products.find((p) => p.id === o.product_id)?.name ?? ''}: `}{Object.entries(o.observed).map(([m, v]) => `${m} ${v}/3`).join(', ')} {o.text}</div>
        ))}
        <div className="sub" style={{ marginTop: 6 }}>Associations are counts of what was recorded, not evidence of cause.</div>
      </Card>
      <Card>
        <h3>Photos</h3>
        {d.photos.length === 0 ? 'None.' : `${plural(d.photos.length, 'photo')} on file (${[...new Set(d.photos.map((p) => p.date))].length} dates).`}
        {withPhotos && <div className="row wrap" style={{ marginTop: 8 }}>{d.photos.map((p) => <div key={p.id}><PhotoImg id={p.id} /><div className="sub">{p.date} {p.angle}</div></div>)}</div>}
      </Card>
      <Card>
        <h3>Patient notes</h3>
        {notes.length ? notes.map((l) => <div key={l.id}><b>{l.date}</b> {l.notes}</div>) : 'None.'}
      </Card>
      <div className="sub">Generated {stamp()} from patient-entered data. Not a medical record or diagnosis.</div>
    </>
  );
}
