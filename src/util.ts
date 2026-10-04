export const uid = (prefix: string): string => {
  const c = globalThis.crypto as Crypto | undefined;
  const r = c?.randomUUID ? c.randomUUID() : Array.from({ length: 4 }, () => Math.random().toString(16).slice(2, 10)).join('');
  return `${prefix}_${r.replace(/-/g, '').slice(0, 16)}`;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const dayNum = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export const fromDayNum = (n: number) => { const d = new Date(n * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export const addDays = (iso: string, n: number) => fromDayNum(dayNum(iso) + n);
export const diffDays = (a: string, b: string) => dayNum(a) - dayNum(b);
export const isISO = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const fmtShort = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}`; };
export const fmtLong = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${MONTHS[m - 1]} ${d}`; };

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
