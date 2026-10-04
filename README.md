# Skin & Cycle Tracker (v0.1)

Local-first mobile PWA for logging skin, cycle, symptoms, lifestyle and skincare. React + TypeScript + Vite, IndexedDB storage, no backend, no network calls with health data.

    npm install
    npm run dev        # http://<your-LAN-ip>:5173
    npm run build && npm run preview

- `src/types.ts` data model (schema_version 0.1) · `src/cycle.ts` cycle day/prediction (derived, never a fixed 28 days)
- `src/analytics.ts` descriptive-only patterns (derived, exported under `derived`) · `src/exporter.ts` JSON/CSV export, import, validation, migrations
- `src/ai/index.ts` mock `analyzeSkinData`, `generateDailyRoutine`, `generateDoctorSummary` + safety rules

Install on iPhone: the service worker and "Add to Home Screen" need HTTPS (deploy `dist/` to any static host, or tunnel the dev server), then Safari > Share > Add to Home Screen.
