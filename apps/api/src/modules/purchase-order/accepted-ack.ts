/**
 * An 855 with ackStatus=accepted confirms the current binding promise.
 * Qty/date amendments must use date_change or split and a reason_code —
 * otherwise a default "accepted" submit silently rewrites the schedule
 * that OTIF is measured against (domain rules 6 and 7).
 */
export type FirmPromise = {
  firmQty: string;
  firmDate: string;
};

export type AckLike = {
  ackStatus: string;
  promiseQty: string;
  promiseDate: string;
  acknowledgedAt: Date | string;
};

export type BindingPromise = {
  promiseQty: string;
  promiseDate: string;
};

export function currentBindingPromise(po: FirmPromise, acks: AckLike[]): BindingPromise {
  const binding = acks.filter((a) => a.ackStatus !== "rejected");
  if (binding.length === 0) {
    return { promiseQty: po.firmQty, promiseDate: po.firmDate };
  }
  const latest = [...binding].sort((a, b) => ackTime(b) - ackTime(a))[0]!;
  return { promiseQty: latest.promiseQty, promiseDate: latest.promiseDate };
}

export function acceptedMatchesBinding(
  input: { promiseQty: string; promiseDate: string },
  binding: BindingPromise,
): boolean {
  return Number(input.promiseQty) === Number(binding.promiseQty) && input.promiseDate === binding.promiseDate;
}

function ackTime(ack: AckLike): number {
  const value = ack.acknowledgedAt instanceof Date ? ack.acknowledgedAt : new Date(ack.acknowledgedAt);
  return value.getTime();
}
