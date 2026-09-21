import { ExceptionsBoard } from "./exceptions-board";

export default function ExceptionsPage() {
  return (
    <main className="page page-wide">
      <p className="kicker">Phase 4 / 9 · engine + dashboard</p>
      <h1>Exceptions</h1>
      <p className="lede">
        SLA comes from trading-partner setup, not from code. A missed response
        opens <code>sla_silence</code> — it never flips the commit to accepted.
        Gap and late are raised as planning facts on the published version.
      </p>
      <ExceptionsBoard />
    </main>
  );
}
