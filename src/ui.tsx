import { useEffect, useState, type ReactNode } from 'react';
import type { Sev } from './types';

// ---- tiny hash router ----
export const useHash = () => {
  const [h, setH] = useState(() => location.hash.slice(1) || 'today');
  useEffect(() => { const f = () => setH(location.hash.slice(1) || 'today'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};
export const go = (to: string) => { location.hash = to; scrollTo(0, 0); };

export function Back({ to, label = 'More' }: { to: string; label?: string }) {
  return <button className="back" onClick={() => go(to)}>‹ {label}</button>;
}

export function Chip({ on, onClick, tone, small, children }: { on?: boolean; onClick?: () => void; tone?: 'peach' | 'lav' | 'sun'; small?: boolean; children: ReactNode }) {
  return <button type="button" className={`chip ${tone ?? ''} ${small ? 'sm' : ''} ${on ? 'on' : ''}`} aria-pressed={!!on} onClick={onClick}>{children}</button>;
}

/** 0–3 selector. Tapping the active value clears it (back to "not recorded"). */
export function Sev3({ value, onChange, labels }: { value?: number; onChange: (v: Sev | undefined) => void; labels?: readonly string[] }) {
  return (
    <div className={`seg ${labels ? 'acne' : ''}`} role="group">
      {[0, 1, 2, 3].map((v) => (
        <button key={v} type="button" data-v={v} className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(value === v ? undefined : (v as Sev))}>{labels ? labels[v] : v}</button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 20, step = 1 }: { value?: number; onChange: (v: number | undefined) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="less" onClick={() => onChange(value === undefined || value <= min ? undefined : value - step)}>−</button>
      <span>{value ?? '–'}</span>
      <button type="button" aria-label="more" onClick={() => onChange(Math.min(max, (value ?? min - step) + step))}>+</button>
    </div>
  );
}

export const Card = ({ children, cls = '' }: { children: ReactNode; cls?: string }) => <div className={`card ${cls}`}>{children}</div>;
export const Field = ({ label, children }: { label: string; children: ReactNode }) => <div className="field"><label>{label}</label>{children}</div>;

let toastTimer: number | undefined;
export function useToast() {
  const [msg, setMsg] = useState('');
  const show = (m: string) => { setMsg(m); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => setMsg(''), 2200); };
  return [msg ? <div className="toast" role="status">{msg}</div> : null, show] as const;
}

export const sevDot = (v: number | undefined) => <span className={`dot s${v ?? 0}`} />;
