import { CommitsInbox } from "./commits-inbox";

export default function CommitsPage() {
  return (
    <main className="page page-wide">
      <p className="kicker">Phase 3 · splits, gap, late</p>
      <h1>Commits</h1>
      <p className="lede">
        What the supplier committed, in how many splits, at what grade — and what
        is still uncommitted, and why. Planning-grade dates are never shown as
        binding promises.
      </p>
      <CommitsInbox />
    </main>
  );
}
