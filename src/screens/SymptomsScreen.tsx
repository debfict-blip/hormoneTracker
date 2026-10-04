import { addCustomSymptom, setSymptomEnabled, useStore } from '../store';
import { useState } from 'react';
import { Back, Card, Chip } from '../ui';

export function SymptomsScreen() {
  const { data: d } = useStore();
  const [t, setT] = useState('');
  return (
    <>
      <Back to="more" />
      <h1>Symptom tags</h1>
      <div className="sub" style={{ marginBottom: 10 }}>Hidden tags stay in your history; they just stop showing in the quick log.</div>
      <Card>
        <div className="chips">{d.symptoms.map((s) => <Chip key={s.id} tone="lav" on={s.enabled} onClick={() => setSymptomEnabled(s.id, !s.enabled)}>{s.label}</Chip>)}</div>
      </Card>
      <div className="row"><input type="text" placeholder="New symptom tag" value={t} onChange={(e) => setT(e.target.value)} /><button className="btn primary" onClick={() => { addCustomSymptom(t); setT(''); }}>Add</button></div>
    </>
  );
}
