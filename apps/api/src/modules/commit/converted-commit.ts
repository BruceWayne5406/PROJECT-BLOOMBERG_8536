/**
 * Convert copies an accepted firming/frozen split onto a purchase order.
 * That PO is the binding schedule. Superseding the source commit afterwards
 * hides the qty from gap math (the new row is offered/zero) so a replacement
 * split can be accepted and converted — a second PO for the same slice.
 *
 * Pre-convert supersedes stay allowed: the buyer has not yet created a
 * schedule line, so revising the offered/accepted commit is still a forecast
 * response, not a post-firm amendment.
 */
export function convertedCommitBlocksSupersede(hasPurchaseOrder: boolean): boolean {
  return hasPurchaseOrder;
}

export function supersedeAfterConvertMessage(input: {
  commitId: string;
  poNumber: string;
  line: string;
  scheduleLine: string;
}): string {
  return (
    `${input.commitId} is already schedule ` +
    `${input.poNumber}/${input.line}/${input.scheduleLine}. ` +
    "Post-convert amendments must use a change order"
  );
}
