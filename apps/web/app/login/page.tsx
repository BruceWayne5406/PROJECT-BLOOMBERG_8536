import { Suspense } from "react";
import { AuthPanel } from "./auth-panel";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <p className="kicker">Supplier–buyer commitments</p>
        <h1>Sign in to the collaboration record</h1>
        <p className="lede">
          Forecasts, commits, and change-orders live here — not in email. You sign in
          as a planner or buyer/supplier seat against a trading partner, so every write
          carries an <span className="mono">actor_id</span>.
        </p>
      </section>
      <Suspense fallback={<p className="lede">Loading…</p>}>
        <AuthPanel />
      </Suspense>
    </main>
  );
}
