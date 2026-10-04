import { useState } from 'react';
import { buildExport, dailyCsv, parseImport, saveFile, stamp, usageCsv } from '../exporter';
import { getData, replaceAll, useStore, wipeAll } from '../store';
import { Back, Card, useToast } from '../ui';

export function DataScreen() {
  const { data: d } = useStore();
  const [toast, show] = useToast();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const json = async (photoData: boolean, name: string) => { const b = await buildExport(getData(), { photoData }); await saveFile(`${name}-${stamp()}.json`, 'application/json', JSON.stringify(b, null, 2)); show('Exported'); };

  const onImport = async (f: File) => {
    try {
      const { data, blobs, warnings } = parseImport(await f.text());
      const summary = `${data.logs.length} daily logs, ${data.cycles.length} cycles, ${data.products.length} products, ${data.photos.length} photos`;
      if (!confirm(`Import ${summary}?\n\nThis REPLACES all data currently on this device.`)) return;
      await replaceAll(data, blobs);
      setMsg({ ok: true, text: `Imported ${summary}.${warnings.length ? ' ' + warnings.join(' ') : ''}` });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };

  return (
    <>
      <Back to="more" />
      <h1>Export, import & data</h1>
      <div className="sub" style={{ marginBottom: 10 }}>On device now: {d.logs.length} daily logs · {d.cycles.length} periods · {d.products.length} products · {d.photos.length} photos. Nothing is sent anywhere unless you share a file.</div>

      <h2>Export</h2>
      <Card>
        <button className="btn primary block" style={{ minHeight: 54 }} onClick={() => json(false, 'skin-cycle-claude')}>✨ Export for Claude (JSON)</button>
        <div className="sub" style={{ margin: '6px 0 14px' }}>Structured, human-readable, includes photo metadata but no images.</div>
        <button className="btn block" onClick={() => { location.hash = 'more/report'; }}>🩺 Export for Doctor (summary / PDF)</button>
        <div style={{ height: 8 }} />
        <button className="btn block" onClick={() => saveFile(`daily-logs-${stamp()}.csv`, 'text/csv', dailyCsv(getData()))}>Daily logs (CSV)</button>
        <div style={{ height: 8 }} />
        <button className="btn block" onClick={() => saveFile(`product-usage-${stamp()}.csv`, 'text/csv', usageCsv(getData()))}>Product usage (CSV)</button>
      </Card>

      <h2>Backup & restore</h2>
      <Card>
        <button className="btn block" onClick={() => json(true, 'skin-cycle-backup')}>Full backup incl. photos (JSON)</button>
        <div className="sub" style={{ margin: '6px 0 14px' }}>Photos are embedded, so the file can be large.</div>
        <label className="btn block" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>Import JSON…
          <input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onImport(f); }} />
        </label>
        {msg && <div className="note" style={{ background: msg.ok ? 'var(--sage-l)' : 'var(--peach-l)', whiteSpace: 'pre-wrap' }}>{msg.text}</div>}
      </Card>

      <h2>Danger zone</h2>
      <Card>
        <button className="btn danger block" onClick={async () => { if (confirm('Delete ALL local data on this device? Export a backup first.') && confirm('Really delete everything?')) { await wipeAll(); setMsg({ ok: true, text: 'All local data deleted.' }); } }}>Delete all local data</button>
      </Card>
      {toast}
    </>
  );
}
