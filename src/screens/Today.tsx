import { cycleDayFor, predictNext } from '../cycle';
import { toggleUsage, updateLog, useStore } from '../store';
import { Card, Chip, go } from '../ui';
import { addDays, fmtShort, fmtLong, plural, todayISO } from '../util';
import { DayCard } from './DayCard';

export function Today() {
  const { data: d } = useStore();
  const today = todayISO();
  const cd = cycleDayFor(today, d.cycles);
  const pred = predictNext(d.cycles, today);
  const log = d.logs.find((l) => l.date === today);
  const have = (id: string) => log?.symptoms.some((s) => s.symptom_id === id) ?? false;
  const toggleSym = (id: string) => updateLog(today, (l) => ({ ...l, symptoms: have(id) ? l.symptoms.filter((s) => s.symptom_id !== id) : [...l.symptoms, { symptom_id: id }] }));
  const products = d.products.filter((p) => p.enabled);
  const used = (pid: string, slot: 'am' | 'pm') => d.usage.some((u) => u.date === today && u.product_id === pid && u.slot === slot);
  const recent = [...d.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <>
      <div className="sub">{fmtLong(today)}</div>
      <h1>Hello 🌿</h1>
      <Card cls="hero">
        <div className="row sp">
          <div>
            <div className="sub">Cycle day</div>
            <div className="big">{cd ?? '–'}</div>
          </div>
          <div style={{ textAlign: 'right' }} className="sub">
            {pred ? (
              pred.days_until >= 0
                ? <>Estimated next period<br /><b style={{ color: 'var(--ink)' }}>{fmtShort(pred.date)} · in {plural(pred.days_until, 'day')}</b><br />based on {plural(pred.n, 'recorded cycle')} ({pred.min_len}–{pred.max_len} d)</>
                : <>Past the estimated date ({fmtShort(pred.date)})<br />by {plural(-pred.days_until, 'day')}. Cycles vary.</>
            ) : cd === null ? <>Log a period start to<br />begin cycle tracking</> : <>Need one more period start<br />to estimate the next</>}
          </div>
        </div>
      </Card>

      <button className="cta" onClick={() => go('log')}>＋ Log today{log ? ' (edit)' : ''}</button>

      <h2>Catch up on past days</h2>
      <div className="chips">
        {Array.from({ length: 7 }, (_, i) => addDays(today, -(i + 1))).map((day) => {
          const done = d.logs.some((l) => l.date === day);
          return <Chip key={day} small on={done} onClick={() => go(`log/${day}`)}>{done ? '✓ ' : ''}{fmtShort(day)}</Chip>;
        })}
      </div>
      <div className="sub" style={{ marginTop: 6 }}>Tap a day to add or edit symptoms, period dates and skincare. Older days: use the date picker on the Log tab.</div>

      <h2>Quick symptoms</h2>
      <div className="chips">
        {d.symptoms.filter((s) => s.enabled).slice(0, 8).map((s) => <Chip key={s.id} tone="lav" on={have(s.id)} onClick={() => toggleSym(s.id)}>{s.label}</Chip>)}
        <Chip small onClick={() => go('log')}>more…</Chip>
      </div>

      <h2>Today’s skincare</h2>
      <Card>
        {products.length === 0 ? (
          <div className="sub">No products yet. <a href="#more/products">Add some</a> to log your routine in one tap.</div>
        ) : products.map((p) => (
          <div key={p.id} className="row sp" style={{ padding: '6px 0' }}>
            <div><b>{p.name}</b><div className="sub">{p.category}</div></div>
            <div className="row">
              <Chip small on={used(p.id, 'am')} onClick={() => toggleUsage(today, p.id, 'am')}>AM</Chip>
              <Chip small on={used(p.id, 'pm')} onClick={() => toggleUsage(today, p.id, 'pm')}>PM</Chip>
            </div>
          </div>
        ))}
      </Card>

      <h2>Recent</h2>
      {recent.length === 0 ? <Card><span className="sub">Nothing logged yet. Tap “Log today” to start; one tap is enough.</span></Card> : <div className="tl">{recent.map((l) => <DayCard key={l.id} log={l} d={d} />)}</div>}
      {recent.length > 0 && <button className="btn block" onClick={() => go('timeline')}>Full timeline</button>}
    </>
  );
}
