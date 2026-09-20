/**
 * OTIF / last promise is measured against the last accepted supplier promise,
 * never the original forecast request. Until an 855/CO ack exists, that promise
 * is the PO firm qty/date copied from the converted commit.
 *
 * A rejected acknowledgement is not a promise — skip it and keep the prior
 * accepted ack, or the firm schedule if none exists.
 */
export type OtifAck = {
  ackStatus: string;
  promiseQty: string;
  promiseDate: string;
  acknowledgedAt: Date | string;
};

export type OtifReceipt = {
  eventType: string;
  qty: string | null;
  occurredAt: Date | string;
};

export function resolveBindingPromise(
  po: { firmQty: string; firmDate: string },
  acks: OtifAck[],
): { promiseQty: string; promiseDate: string } {
  const latest = [...acks]
    .filter((a) => a.ackStatus !== "rejected")
    .sort((a, b) => ackMs(b.acknowledgedAt) - ackMs(a.acknowledgedAt))[0];
  if (latest) {
    return { promiseQty: latest.promiseQty, promiseDate: latest.promiseDate };
  }
  return { promiseQty: po.firmQty, promiseDate: po.firmDate };
}

export function resolveOtif(
  promiseDate: string,
  receipts: OtifReceipt[],
): { receiptDate: string; receivedQty: string | null; otif: boolean } | null {
  const latest = [...receipts]
    .filter((r) => r.eventType === "receipt")
    .sort((a, b) => ackMs(b.occurredAt) - ackMs(a.occurredAt))[0];
  if (!latest) return null;
  const receiptDate = calendarDate(latest.occurredAt);
  return {
    receiptDate,
    receivedQty: latest.qty,
    otif: receiptDate <= promiseDate,
  };
}

function ackMs(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function calendarDate(value: Date | string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
