import { useEffect, useState } from 'react';
import { addCustomSymptom, addPhoto, isPeriodEnd, isPeriodStart, patchUsage, photoBlob, removePhoto, togglePeriodEnd, togglePeriodStart, toggleUsage, updateLog, useStore } from '../store';
import { ACNE_LEVELS, ACNE_LOCATIONS, PHOTO_ANGLES, SKIN_METRICS, type DailyLog, type Sev, type SkinMetric } from '../types';
import { Card, Chip, Field, Sev3, Stepper, go, sevDot, useToast } from '../ui';
import { addDays, fmtLong, todayISO } from '../util';
import { cycleDayFor } from '../cycle';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function QuickLog({ date: dateParam }: { date?: string }) {
  const { data: d } = useStore();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayISO();
  const log = d.logs.find((l) => l.date === date);
  const [toast, show] = useToast();
  const [custom, setCustom] = useState('');
  const edit = (fn: (l: DailyLog) => DailyLog) => { updateLog(date, fn); show('Saved ✓'); };
  const skin = log?.skin ?? {};
  const cd = cycleDayFor(date, d.cycles);

  const setMetric = (m: SkinMetric, v: Sev | undefined) => edit((l) => ({ ...l, skin: { ...l.skin, [m]: v } }));
  const setAcne = (level: Sev | undefined) => edit((l) => {
    const { acne: _a, ...rest } = l.skin;
    return { ...l, skin: level === undefined ? rest : { ...rest, acne: { level, locations: level === 0 ? [] : l.skin.acne?.locations ?? [] } } };
  });
  const toggleLoc = (loc: string) => edit((l) => {
    const cur = l.skin.acne ?? { level: 1 as Sev, locations: [] };
    const locations = cur.locations.includes(loc) ? cur.locations.filter((x) => x !== loc) : [...cur.locations, loc];
    return { ...l, skin: { ...l.skin, acne: { level: cur.level === 0 ? 1 : cur.level, locations } } };
  });
  const sym = (id: string) => log?.symptoms.find((s) => s.symptom_id === id);
  const toggleSym = (id: string) => edit((l) => ({ ...l, symptoms: sym(id) ? l.symptoms.filter((s) => s.symptom_id !== id) : [...l.symptoms, { symptom_id: id }] }));
  const setSymSev = (id: string, severity: Sev | undefined) => edit((l) => ({ ...l, symptoms: l.symptoms.map((s) => (s.symptom_id === id ? { ...s, severity } : s)) }));
  const life = (patch: Partial<DailyLog['lifestyle']>) => edit((l) => ({ ...l, lifestyle: { ...l.lifestyle, ...patch } }));
  const cyc = (patch: Partial<DailyLog['cycle']>) => edit((l) => ({ ...l, cycle: { ...l.cycle, ...patch } }));

  const addCustom = () => {
    const s = addCustomSymptom(custom); setCustom('');
    if (s && !sym(s.id)) toggleSym(s.id);
  };
  const usage = (pid: string, slot: 'am' | 'pm') => d.usage.find((u) => u.date === date && u.product_id === pid && u.slot === slot);
  const products = d.products.filter((p) => p.enabled);
  const photos = d.photos.filter((p) => p.date === date);

  return (
    <>
      <div className="row sp">
        <button className="btn sm" onClick={() => go(`log/${addDays(date, -1)}`)} aria-label="Previous day">‹</button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 22 }}>{date === todayISO() ? 'Today' : fmtLong(date)}</h1>
          <div className="sub">{date === todayISO() ? fmtLong(date) : ''}{cd !== null && ` · CD ${cd}`}</div>
        </div>
        <button className="btn sm" disabled={date >= todayISO()} onClick={() => go(`log/${addDays(date, 1)}`)} aria-label="Next day">›</button>
      </div>

      <h2>Cycle</h2>
      <div className="chips">
        <Chip tone="peach" on={isPeriodStart(date)} onClick={() => { togglePeriodStart(date); show('Saved ✓'); }}>🩸 Period started</Chip>
        <Chip tone="peach" on={isPeriodEnd(date)} onClick={() => { togglePeriodEnd(date); show('Saved ✓'); }}>Period ended</Chip>
        <Chip tone="peach" on={!!log?.cycle.spotting} onClick={() => cyc({ spotting: !log?.cycle.spotting || undefined })}>Spotting</Chip>
        <Chip tone="lav" on={!!log?.cycle.ovulation_sign} onClick={() => cyc({ ovulation_sign: !log?.cycle.ovulation_sign || undefined })}>Ovulation sign</Chip>
        <Chip tone="lav" on={!!log?.cycle.pms_symptoms} onClick={() => cyc({ pms_symptoms: !log?.cycle.pms_symptoms || undefined })}>PMS symptom</Chip>
      </div>

      <h2>Skin</h2>
      <Card>
        <Field label="Acne"><Sev3 value={skin.acne?.level} onChange={setAcne} labels={ACNE_LEVELS} /></Field>
        {(skin.acne?.level ?? 0) > 0 && (
          <Field label="Where? (pick any)">
            <div className="chips">{ACNE_LOCATIONS.map((l) => <Chip key={l} tone="peach" on={skin.acne?.locations.includes(l)} onClick={() => toggleLoc(l)}>{cap(l)}</Chip>)}</div>
          </Field>
        )}
        {SKIN_METRICS.map((m) => (
          <Field key={m} label={`${cap(m)}${skin[m] !== undefined ? '' : ''}`}><Sev3 value={skin[m]} onChange={(v) => setMetric(m, v)} /></Field>
        ))}
        <div className="sub">Tap a selected number again to clear it. Skipped = not recorded.</div>
      </Card>

      <h2>Other symptoms</h2>
      <Card>
        <div className="chips">
          {d.symptoms.filter((s) => s.enabled || sym(s.id)).map((s) => <Chip key={s.id} tone="lav" on={!!sym(s.id)} onClick={() => toggleSym(s.id)}>{s.label}</Chip>)}
        </div>
        {log?.symptoms.length ? (
          <div style={{ marginTop: 12 }}>
            <div className="sub" style={{ marginBottom: 6 }}>Optional severity</div>
            {log.symptoms.map((s) => (
              <div key={s.symptom_id} style={{ marginBottom: 8 }}>
                <div className="lab">{d.symptoms.find((x) => x.id === s.symptom_id)?.label}</div>
                <Sev3 value={s.severity} onChange={(v) => setSymSev(s.symptom_id, v)} />
              </div>
            ))}
          </div>
        ) : null}
        <div className="row" style={{ marginTop: 12 }}>
          <input type="text" placeholder="Add your own symptom" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
          <button className="btn" onClick={addCustom}>Add</button>
        </div>
      </Card>

      <h2>Skincare used</h2>
      <Card>
        {products.length === 0 && <div className="sub">No products yet. <a href="#more/products">Add some</a>.</div>}
        {products.map((p) => {
          const am = usage(p.id, 'am'), pm = usage(p.id, 'pm');
          return (
            <div key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row sp">
                <div><b>{p.name}</b> <span className="sub">{p.category}</span></div>
                <div className="row">
                  <Chip small on={!!am} onClick={() => { toggleUsage(date, p.id, 'am'); show('Saved ✓'); }}>AM</Chip>
                  <Chip small on={!!pm} onClick={() => { toggleUsage(date, p.id, 'pm'); show('Saved ✓'); }}>PM</Chip>
                </div>
              </div>
              {p.category === 'device' && [am, pm].map((u) => u && (
                <div key={u.id} className="row" style={{ margin: '6px 0' }}>
                  <span className="sub" style={{ width: 28 }}>{u.slot.toUpperCase()}</span>
                  <input type="number" inputMode="numeric" placeholder="min" style={{ width: 84 }} value={u.duration_min ?? ''} onChange={(e) => patchUsage(u.id, { duration_min: e.target.value ? Number(e.target.value) : undefined })} />
                  <input type="text" placeholder="intensity / mode" value={u.intensity ?? ''} onChange={(e) => patchUsage(u.id, { intensity: e.target.value || undefined })} />
                </div>
              ))}
            </div>
          );
        })}
        <div className="sub" style={{ marginTop: 8 }}>This records what you used, nothing more.</div>
      </Card>

      <h2>Lifestyle (optional)</h2>
      <Card>
        <Field label="Sleep hours"><div className="chips">{[4, 5, 6, 7, 8, 9, 10].map((h) => <Chip key={h} small on={log?.lifestyle.sleep_hours === h} onClick={() => life({ sleep_hours: log?.lifestyle.sleep_hours === h ? undefined : h })}>{h}h</Chip>)}</div></Field>
        <Field label="Sleep quality"><Sev3 value={log?.lifestyle.sleep_quality} onChange={(v) => life({ sleep_quality: v })} /></Field>
        <Field label="Stress"><Sev3 value={log?.lifestyle.stress} onChange={(v) => life({ stress: v })} /></Field>
        <Field label="Exercise"><div className="chips">{(['none', 'light', 'moderate', 'hard'] as const).map((x) => <Chip key={x} small on={log?.lifestyle.exercise === x} onClick={() => life({ exercise: log?.lifestyle.exercise === x ? undefined : x })}>{cap(x)}</Chip>)}</div></Field>
        <div className="row sp">
          <Field label="Caffeine (cups)"><Stepper value={log?.lifestyle.caffeine_cups} onChange={(v) => life({ caffeine_cups: v })} max={12} /></Field>
          <Field label="Alcohol (drinks)"><Stepper value={log?.lifestyle.alcohol_drinks} onChange={(v) => life({ alcohol_drinks: v })} max={12} /></Field>
        </div>
      </Card>

      <h2>Photos (stay on this device)</h2>
      <Card>
        <div className="chips">
          {PHOTO_ANGLES.map((a) => (
            <label key={a} className="chip" style={{ cursor: 'pointer' }}>📷 {cap(a)}
              <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { await addPhoto(date, a, await shrink(f)); show('Photo saved ✓'); } }} />
            </label>
          ))}
        </div>
        {photos.length > 0 && <div className="row wrap" style={{ marginTop: 12 }}>{photos.map((p) => <Thumb key={p.id} id={p.id} label={p.angle} onDelete={() => { if (confirm('Delete this photo?')) void removePhoto(p.id); }} />)}</div>}
      </Card>

      <h2>Notes</h2>
      <textarea placeholder="Anything else worth remembering…" defaultValue={log?.notes ?? ''} onBlur={(e) => { if ((e.target.value || undefined) !== log?.notes) edit((l) => ({ ...l, notes: e.target.value || undefined })); }} />

      <div className="sticky" style={{ marginTop: 16 }}>
        <button className="cta" onClick={() => go('today')}>Done {sevDot(undefined)}</button>
      </div>
      {toast}
    </>
  );
}

function Thumb({ id, label, onDelete }: { id: string; label: string; onDelete: () => void }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => { let u: string | undefined; void photoBlob(id).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } }); return () => { if (u) URL.revokeObjectURL(u); }; }, [id]);
  return <div onClick={onDelete} title="Tap to delete" style={{ textAlign: 'center' }}>{url ? <img className="photo" src={url} alt={`${label} photo`} /> : <div className="photo" />}<div className="sub">{label}</div></div>;
}

/** Downscale to keep local storage small. */
async function shrink(file: File, max = 1280): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.82));
  } catch { return file; }
}
