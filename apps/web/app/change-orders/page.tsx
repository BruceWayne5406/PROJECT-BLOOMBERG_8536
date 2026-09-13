import { ChangeOrderList } from "./change-order-list";

export default function ChangeOrdersPage() {
  return (
    <main className="page page-wide">
      <p className="kicker">Phase 6 · dual acceptance</p>
      <h1>Change orders</h1>
      <p className="lede">
        A post-firm amendment is a versioned change order with a required{" "}
        <code>reason_code</code>. Both buyer and supplier must accept before the
        last promise date moves. The original PO firm qty/date is not overwritten.
      </p>
      <ChangeOrderList />
    </main>
  );
}
