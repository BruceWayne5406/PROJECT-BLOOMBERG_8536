import { PurchaseOrderList } from "./po-list";

export default function PurchaseOrdersPage() {
  return (
    <main className="page page-wide">
      <p className="kicker">Phase 5 · binding conversion</p>
      <h1>Purchase orders</h1>
      <p className="lede">
        Schedule lines are created from accepted firming or frozen commits — never
        re-keyed, never from a planning-grade date. OTIF is measured against the
        last accepted promise date.
      </p>
      <PurchaseOrderList />
    </main>
  );
}
