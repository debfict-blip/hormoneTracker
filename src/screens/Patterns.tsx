import { computePatterns } from '../analytics';
import { useStore } from '../store';
import { Back, Card } from '../ui';

export function Patterns() {
  const { data: d } = useStore();
  const ps = computePatterns(d);
  const groups: [string, string[]][] = [
    ['Cycles', ['cycle']], ['Acne', ['acne_location', 'acne_cycle_day']], ['Symptoms', ['symptom_frequency']], ['Products & devices (observed association)', ['product_next_day']],
  ];
  return (
    <>
      <Back to="more" />
      <h1>Patterns</h1>
      <div className="note">Descriptive counts of what you recorded, with sample sizes. These are not causes, risks or diagnoses; small samples can look like patterns by chance.</div>
      {ps.length === 0 && <Card><span className="sub">Not enough data yet. Keep logging; patterns appear after a few entries and recorded periods.</span></Card>}
      {groups.map(([title, kinds]) => {
        const items = ps.filter((p) => kinds.includes(p.kind));
        return items.length ? (
          <div key={title}><h2>{title}</h2><Card>{items.map((p) => <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>{p.text}<div className="sub">n = {p.sample_size}</div></div>)}</Card></div>
        ) : null;
      })}
    </>
  );
}
