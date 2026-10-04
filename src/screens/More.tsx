import { Back, Card, go } from '../ui';
import { Products } from './Products';
import { Observations } from './Observations';
import { Patterns } from './Patterns';
import { DataScreen } from './DataScreen';
import { Report } from './Report';
import { SymptomsScreen } from './SymptomsScreen';

const ITEMS: [string, string, string][] = [
  ['products', '🧴 Products & devices', 'Your library'],
  ['observations', '📝 Observations', '“After X, I noticed Y”'],
  ['patterns', '📊 Patterns', 'Descriptive counts only'],
  ['symptoms', '🏷 Symptom tags', 'Show / hide / add'],
  ['report', '🩺 Export for Doctor', 'Printable summary'],
  ['data', '💾 Export, import & data', 'JSON · CSV · Claude'],
];

export function More({ sub }: { sub?: string }) {
  switch (sub) {
    case 'products': return <Products />;
    case 'observations': return <Observations />;
    case 'patterns': return <Patterns />;
    case 'symptoms': return <SymptomsScreen />;
    case 'report': return <Report />;
    case 'data': return <DataScreen />;
  }
  return (
    <>
      <h1>More</h1>
      <Card>
        {ITEMS.map(([k, t, s]) => (
          <a key={k} className="list-item" href={`#more/${k}`} onClick={(e) => { e.preventDefault(); go(`more/${k}`); }}>
            <div><b>{t}</b><div className="sub">{s}</div></div><span className="sub">›</span>
          </a>
        ))}
      </Card>
      <div className="note">Skin & Cycle Tracker is a personal tracking aid, not a medical device. It records what you enter, shows simple counts, and never diagnoses or says a product caused something. All data stays on this device unless you export it.</div>
    </>
  );
}
export { Back };
