/**
 * Portal 855 defaults must follow the last accepted promise (855 / CO ack),
 * never the original convert-time firm schedule. Re-acking "accepted" with
 * the firm qty/date would rewind a date_change and make OTIF measure the
 * wrong date (domain rule 7). Rejected acknowledgements are not promises.
 *
 * `acknowledgements` must be newest-first.
 */
export function resolveAckFormSeed(input: {
  firmQty: string;
  firmDate: string;
  acknowledgements: Array<{
    ackStatus: string;
    promiseQty: string;
    promiseDate: string;
  }>;
}): { promiseQty: string; promiseDate: string } {
  const latest = input.acknowledgements.find((a) => a.ackStatus !== "rejected");
  return {
    promiseQty: asQty(latest?.promiseQty ?? input.firmQty),
    promiseDate: asIsoDate(latest?.promiseDate ?? input.firmDate),
  };
}

function asQty(value: string): string {
  return String(Number(value));
}

function asIsoDate(value: string): string {
  return value.slice(0, 10);
}
