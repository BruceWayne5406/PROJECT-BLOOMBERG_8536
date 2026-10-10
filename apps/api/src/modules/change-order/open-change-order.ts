/**
 * Dual-accepted change orders write a new PO acknowledgement that becomes
 * the last promise. Two proposed COs on the same PO can both be accepted,
 * and the later ack silently overwrites the earlier binding amendment.
 *
 * Trigger: convert FC-88421 / CM-01 to PO-88421, propose a qty CO (30k) and
 * a date CO (22 Dec). Accepting both rewinds firm qty back to 40k (or
 * stacks unrelated amendments) because each accept writes a full promise.
 */

export type ChangeOrderLike = {
  changeOrderId: string;
  status: string;
  version?: number;
};

export function openProposedChangeOrderId(
  rows: ChangeOrderLike[],
): string | null {
  const current = latestByChangeOrderId(rows);
  const open = current.find((row) => row.status === "proposed");
  return open?.changeOrderId ?? null;
}

export function siblingProposedChangeOrders<T extends ChangeOrderLike>(
  rows: T[],
  currentChangeOrderId: string,
): T[] {
  const current = latestByChangeOrderId(rows);
  const wanted = currentChangeOrderId.toUpperCase();
  return current.filter(
    (row) => row.status === "proposed" && row.changeOrderId !== wanted,
  );
}

function latestByChangeOrderId<T extends ChangeOrderLike>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const id = row.changeOrderId.toUpperCase();
    const cur = latest.get(id);
    const version = row.version ?? 0;
    const curVersion = cur?.version ?? -1;
    if (!cur || version >= curVersion) {
      latest.set(id, Object.assign({}, row, { changeOrderId: id }));
    }
  }
  return [...latest.values()];
}
