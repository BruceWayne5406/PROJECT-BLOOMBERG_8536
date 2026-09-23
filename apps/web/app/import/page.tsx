import { ImportPanel } from "./import-panel";

export default function ImportPage() {
  return (
    <main className="page">
      <p className="kicker">Phase 7 · Excel channel</p>
      <h1>Import</h1>
      <p className="lede">
        Spreadsheet is an input channel, never the archive. After parse, rows use
        the same publish and offer services as the portal. EDI 850/855/860 later
        hits the same boundary.
      </p>
      <ImportPanel />
    </main>
  );
}
