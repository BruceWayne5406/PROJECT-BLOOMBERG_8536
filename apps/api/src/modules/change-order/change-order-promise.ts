/**
 * Dual-accepted change orders write a new PO acknowledgement.
 * Unspecified qty/date must keep the last accepted promise, not rewind to the
 * original firm schedule. OTIF is measured against that promise.
 */
export function resolveAcceptedChangeOrderPromise(input: {
  proposedQty: string | null;
  proposedDate: string | null;
  lastPromiseQty: string | null;
  lastPromiseDate: string | null;
  firmQty: string;
  firmDate: string;
}): { promiseQty: string; promiseDate: string } {
  return {
    promiseQty: input.proposedQty ?? input.lastPromiseQty ?? input.firmQty,
    promiseDate: input.proposedDate ?? input.lastPromiseDate ?? input.firmDate,
  };
}
