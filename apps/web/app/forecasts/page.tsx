import Link from "next/link";
import { ForecastsTable } from "./forecasts-table";

export default function ForecastsPage() {
  return (
    <main className="page page-wide">
      <div className="page-head">
        <div>
          <p className="kicker">Phase 2 · publish + versioning</p>
          <h1>Forecasts</h1>
          <p className="lede">
            What we asked for, in which version, on which date. Republishing always
            inserts a new version — prior rows are retained.
          </p>
        </div>
        <Link href="/forecasts/new" className="btn btn-primary">
          Publish forecast
        </Link>
      </div>
      <ForecastsTable />
    </main>
  );
}
