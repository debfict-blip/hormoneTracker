import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { init } from './store';

void init();
createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js'); });
}
