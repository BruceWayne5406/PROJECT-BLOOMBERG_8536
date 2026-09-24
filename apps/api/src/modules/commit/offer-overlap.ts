/**
 * offer() keeps accepted slices and replaces offered ones. A stale portal
 * draft still contains the accepted qty/date (FC-88421 CM-01 after Accept).
 * Re-sending that row allocates a new commit id and double-books the slice.
 */
export function offerRepeatsAcceptedSplit(input: {
  accepted: Array<{ committedQty: string; committedDate: string | null }>;
  incoming: Array<{
    commitId?: string;
    committedQty: string;
    committedDate?: string | null;
  }>;
  replaceableIds: string[];
}): boolean {
  const acceptedFingerprints = new Set(
    input.accepted
      .filter((row) => Number(row.committedQty) > 0)
      .map((row) => `${Number(row.committedQty)}|${row.committedDate ?? ""}`),
  );
  const reusable = new Set(input.replaceableIds.map((id) => id.toUpperCase()));
  for (const split of input.incoming) {
    if (Number(split.committedQty) <= 0) continue;
    const id = split.commitId?.toUpperCase();
    if (id && reusable.has(id)) continue;
    const fingerprint = `${Number(split.committedQty)}|${split.committedDate ?? ""}`;
    if (acceptedFingerprints.has(fingerprint)) return true;
  }
  return false;
}
