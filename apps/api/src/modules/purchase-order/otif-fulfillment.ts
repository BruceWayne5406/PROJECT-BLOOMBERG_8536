/**
 * OTIF is On Time In Full: cumulative receipt qty by the promise date must
 * cover the promised qty. Measuring only the latest receipt silently drops
 * earlier splits and can mark a fulfilled PO late after a later event.
 */
export type ReceiptLike = {
  eventType: string;
  qty: string | null;
  occurredAt: Date | string;
};

export type OtifFulfillment = {
  receiptDate: string | null;
  receivedQty: string | null;
  otif: boolean | null;
};

export function computeOtifFulfillment(
  promise: { promiseDate: string | null; promiseQty: string | null },
  events: ReceiptLike[],
): OtifFulfillment {
  const receipts = events.filter((e) => e.eventType === "receipt");
  if (receipts.length === 0) {
    return { receiptDate: null, receivedQty: null, otif: null };
  }

  const receivedQty = receipts.reduce((sum, r) => sum + qtyNumber(r.qty), 0);
  const receiptDates = receipts.map((r) => calendarDate(r.occurredAt)).sort();
  const receiptDate = receiptDates[receiptDates.length - 1] ?? null;

  if (!promise.promiseDate || promise.promiseQty == null) {
    return {
      receiptDate,
      receivedQty: receivedQty.toFixed(4),
      otif: false,
    };
  }

  const onTimeQty = receipts
    .filter((r) => calendarDate(r.occurredAt) <= promise.promiseDate!)
    .reduce((sum, r) => sum + qtyNumber(r.qty), 0);

  return {
    receiptDate,
    receivedQty: receivedQty.toFixed(4),
    otif: onTimeQty >= Number(promise.promiseQty),
  };
}

function qtyNumber(qty: string | null): number {
  if (qty == null || qty === "") return 0;
  const n = Number(qty);
  return Number.isFinite(n) ? n : 0;
}

function calendarDate(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
