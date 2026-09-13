import { PartnersView } from "./partners-view";

export default function PartnersPage() {
  return (
    <main className="page page-wide">
      <p className="kicker">Trading partner setup · data, not code</p>
      <h1>Partners</h1>
      <p className="lede">
        Time fences, flexibility bands, UoM, need-by convention, and response SLA
        live on the trading-partner setup. This screen is read-only — week counts
        are never hardcoded in commit or exception logic.
      </p>
      <PartnersView />
    </main>
  );
}
