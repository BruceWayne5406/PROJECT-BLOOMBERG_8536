/**
 * Domain rule 7: OTIF and "last promise" are measured against the last
 * accepted promise, never a rejected 855. A reject is a refusal, not a
 * schedule the buyer can be scored against.
 */
export type AckLike = {
  ackStatus: string;
  acknowledgedAt: Date | string;
};

export function latestBindingAck<T extends AckLike>(acks: T[]): T | null {
  const binding = acks.filter((a) => a.ackStatus !== "rejected");
  if (binding.length === 0) return null;
  return [...binding].sort((a, b) => ackTime(b) - ackTime(a))[0] ?? null;
}

function ackTime(ack: AckLike): number {
  const value =
    ack.acknowledgedAt instanceof Date
      ? ack.acknowledgedAt
      : new Date(ack.acknowledgedAt);
  return value.getTime();
}
