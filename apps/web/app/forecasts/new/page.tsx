import Link from "next/link";
import { PublishForm } from "./publish-form";

export default function NewForecastPage() {
  return (
    <main className="page">
      <p className="kicker">New collaboration record</p>
      <h1>Publish forecast</h1>
      <p className="lede">
        This is a planning signal, not a purchase order. UoM and dock-vs-ship come from
        the trading partner setup. Publishing does not overwrite a prior version.
      </p>
      <PublishForm />
      <p>
        <Link href="/forecasts">Back to forecasts</Link>
      </p>
    </main>
  );
}
