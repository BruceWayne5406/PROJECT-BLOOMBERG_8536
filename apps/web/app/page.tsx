import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <p className="kicker">Phases 1–9 · forecasts through write-back</p>
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
        gap 10,000 (<code>CAPACITY</code>), late qty 15,000 (planning fact). A
        republish starts the new version uncommitted; those splits stay on the
        version they answered.
      </p>
      <nav className="links">
        <Link href="/forecasts">
          Forecasts <span>Publish, version history, deltas</span>
        </Link>
        <Link href="/commits">
          Commits <span>Splits, gap, late — planning vs binding</span>
        </Link>
        <Link href="/exceptions">
          Exceptions <span>SLA silence, gap, late — five questions</span>
        </Link>
        <Link href="/purchase-orders">
          Purchase orders <span>Binding conversion + ack + OTIF</span>
        </Link>
        <Link href="/change-orders">
          Change orders <span>Dual accept, reason_code required</span>
        </Link>
        <Link href="/import">
          Import <span>Excel channel — no guess-fill</span>
        </Link>
        <Link href="/partners">
          Trading partner setup <span>Fences, bands, SLA as data</span>
        </Link>
      </nav>
    </main>
  );
}
