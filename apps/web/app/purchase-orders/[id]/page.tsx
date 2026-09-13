import { PurchaseOrderDetail } from "./po-detail";

export default async function PurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="page page-wide">
      <p className="kicker">Phase 5 · binding schedule line</p>
      <h1>Purchase order</h1>
      <PurchaseOrderDetail id={id} />
    </main>
  );
}
