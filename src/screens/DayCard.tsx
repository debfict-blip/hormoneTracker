import { cycleDayFor } from '../cycle';
import { SKIN_METRICS, type Data, type DailyLog } from '../types';
import { fmtLong } from '../util';
import { go } from '../ui';

const LV = ['none', 'small', 'moderate', 'deep'];

/** One timeline row: date → CD → skin → symptoms → products → notes. */
export function DayCard({ log, d }: { log: DailyLog; d: Data }) {
  const cd = cycleDayFor(log.date, d.cycles);
  const use = d.usage.filter((u) => u.daily_log_id === log.id);
  const pname = (id: string) => d.products.find((p) => p.id === id)?.name ?? '(deleted product)';
  const a = log.skin.acne;
  const startsPeriod = d.cycles.some((c) => c.start_date === log.date);
  const endsPeriod = d.cycles.some((c) => c.period_end_date === log.date);
  const photos = d.photos.filter((p) => p.daily_log_id === log.id).length;
  return (
    <div className="tl-day" onClick={() => go(`log/${log.date}`)} style={{ cursor: 'pointer' }}>
      <div className="d">{fmtLong(log.date)}{cd !== null && <span className="tag">CD {cd}</span>}</div>
      <div>
        {startsPeriod && <span className="pill r">🩸 period started</span>}
        {endsPeriod && <span className="pill r">period ended</span>}
        {log.cycle.spotting && <span className="pill r">spotting</span>}
        {log.cycle.ovulation_sign && <span className="pill l">ovulation sign</span>}
        {log.cycle.pms_symptoms && <span className="pill l">PMS symptom</span>}
        {a && a.level > 0 && (a.locations.length ? a.locations : ['acne']).map((l) => <span key={l} className="pill"><span className={`dot s${a.level}`} />{l === 'acne' ? 'Acne' : `${l[0].toUpperCase()}${l.slice(1)} acne`}: {a.level} ({LV[a.level]})</span>)}
        {a && a.level === 0 && <span className="pill">No acne</span>}
        {SKIN_METRICS.filter((m) => log.skin[m] !== undefined).map((m) => <span key={m} className="pill"><span className={`dot s${log.skin[m]}`} />{m}: {log.skin[m]}</span>)}
        {log.symptoms.map((s) => <span key={s.symptom_id} className="pill l">{d.symptoms.find((x) => x.id === s.symptom_id)?.label ?? s.symptom_id}{s.severity !== undefined && `: ${s.severity}`}</span>)}
      </div>
      {use.length > 0 && <div>{use.map((u) => <span key={u.id} className="pill p">{pname(u.product_id)} · {u.slot.toUpperCase()}{u.duration_min ? ` ${u.duration_min}m` : ''}{u.intensity ? ` ${u.intensity}` : ''}</span>)}</div>}
      {photos > 0 && <span className="pill">📷 {photos}</span>}
      {log.notes && <div className="sub">“{log.notes}”</div>}
    </div>
  );
}
