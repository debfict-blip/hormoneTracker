import { useStore } from './store';
import { go, useHash } from './ui';
import { Today } from './screens/Today';
import { QuickLog } from './screens/QuickLog';
import { Timeline } from './screens/Timeline';
import { CycleView } from './screens/CycleView';
import { More } from './screens/More';

const TABS: [string, string, string][] = [['today', '☀︎', 'Today'], ['log', '+', 'Log'], ['timeline', '☰', 'Timeline'], ['cycle', '◔', 'Cycle'], ['more', '⋯', 'More']];

export function App() {
  const { ready } = useStore();
  const hash = useHash();
  const [route, ...rest] = hash.split('/');
  if (!ready) return <div className="app"><p className="sub">Loading…</p></div>;
  const page = (() => {
    switch (route) {
      case 'log': return <QuickLog key={rest[0] ?? 'today'} date={rest[0]} />;
      case 'timeline': return <Timeline />;
      case 'cycle': return <CycleView />;
      case 'more': return <More sub={rest[0]} />;
      default: return <Today />;
    }
  })();
  return (
    <>
      <main className="app">{page}</main>
      <nav className="nav noprint" aria-label="Main">
        <div className="nav-in">
          {TABS.map(([r, ic, label]) => (
            <a key={r} href={`#${r}`} className={`${route === r || (r === 'today' && !TABS.some((t) => t[0] === route)) ? 'on' : ''} ${r === 'log' ? 'logb' : ''}`} onClick={(e) => { e.preventDefault(); go(r); }}>
              <span className="ic">{ic}</span>{label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
