import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <p className="kicker">Phase 2 · forecast publish</p>
      <h1>Supplier–buyer commitment platform</h1>
      <p className="lede">
        System of record for forecasts, commits, and change-orders. Contracts stay
        in CLM; specs stay in PLM; ATP stays in APS. This layer versions the
        collaboration record and never treats email or a spreadsheet as the archive.
      </p>
      <div className="swatches">
        <span className="swatch planning">planning</span>
        <span className="swatch firming">firming</span>
        <span className="swatch frozen">frozen / accepted</span>
        <span className="swatch exception">late / gap / SLA</span>
        <span className="swatch superseded">superseded</span>
      </div>
      <p className="lede">
        Seeded example: <code>FC-88421</code> v1 · 100,000 units · dock 15 Dec 2026.
        Split commits <code>CM-01</code> / <code>CM-02</code> / <code>CM-03</code>,
        gap 10,000 (<code>CAPACITY</code>), late qty 15,000 (planning fact).
      </p>
      <nav className="links">
        <Link href="/forecasts">
          Forecasts <span>Publish, version history, deltas</span>
        </Link>
        <Link href="/commits">
          Commits <span>Phase 3 — splits, gap, late</span>
        </Link>
        <Link href="/exceptions">
          Exceptions <span>Phase 4 / 9 — SLA and the five questions</span>
        </Link>
        <Link href="/purchase-orders">
          Purchase orders <span>Phase 5 — binding conversion</span>
        </Link>
        <Link href="/change-orders">
          Change orders <span>Phase 6 — reason_code required</span>
        </Link>
        <Link href="/partners">
          Trading partner setup <span>Fences and bands as data</span>
        </Link>
      </nav>
    </main>
  );
}
