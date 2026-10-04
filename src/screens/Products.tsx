import { useState } from 'react';
import { newProduct, saveProduct, useStore } from '../store';
import { PRODUCT_CATEGORIES, type Product } from '../types';
import { Back, Card, Chip, Field } from '../ui';

export function Products() {
  const { data: d } = useStore();
  const [edit, setEdit] = useState<Product | null>(null);
  const [actives, setActives] = useState('');
  const open = (p: Product) => { setEdit(p); setActives(p.active_ingredients.join(', ')); };

  if (edit) {
    const save = () => { saveProduct({ ...edit, name: edit.name.trim(), active_ingredients: actives.split(',').map((s) => s.trim()).filter(Boolean) }); setEdit(null); };
    return (
      <>
        <Back to="more/products" label="Products" />
        <h1>{edit.name || 'New product'}</h1>
        <Card>
          <Field label="Name"><input type="text" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. YA-MAN" /></Field>
          <Field label="Brand"><input type="text" value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} /></Field>
          <Field label="Category"><div className="chips">{PRODUCT_CATEGORIES.map((c) => <Chip key={c} small on={edit.category === c} onClick={() => setEdit({ ...edit, category: c })}>{c}</Chip>)}</div></Field>
          <Field label="Active ingredients (comma separated)"><input type="text" value={actives} onChange={(e) => setActives(e.target.value)} placeholder="e.g. azelaic acid" /></Field>
          <Field label="Notes"><textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
          <Chip on={edit.enabled} onClick={() => setEdit({ ...edit, enabled: !edit.enabled })}>{edit.enabled ? 'Enabled (shows in logging)' : 'Disabled (hidden)'}</Chip>
        </Card>
        <div className="row"><button className="btn grow" onClick={() => setEdit(null)}>Cancel</button><button className="btn primary grow" disabled={!edit.name.trim()} onClick={save}>Save</button></div>
      </>
    );
  }
  return (
    <>
      <Back to="more" />
      <h1>Products & devices</h1>
      <button className="cta" style={{ minHeight: 52, fontSize: 17 }} onClick={() => open(newProduct())}>＋ Add product</button>
      <div style={{ height: 12 }} />
      {d.products.length === 0 && <Card><span className="sub">Nothing here yet. Add cleansers, treatments, sunscreen and devices such as YA-MAN (category “device”).</span></Card>}
      {d.products.length > 0 && (
        <Card>
          {d.products.map((p) => (
            <div key={p.id} className="list-item" onClick={() => open(p)} style={{ cursor: 'pointer', opacity: p.enabled ? 1 : 0.5 }}>
              <div><b>{p.name}</b>{p.brand && <span className="sub"> · {p.brand}</span>}<div className="sub">{p.category}{p.active_ingredients.length ? ` · ${p.active_ingredients.join(', ')}` : ''}{!p.enabled && ' · disabled'}</div></div><span className="sub">›</span>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
