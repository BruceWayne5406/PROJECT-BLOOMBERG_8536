/**
 * supersede() refuses a firm-fence change without reason_code.
 * offer() supersedes every currently offered split, so the same gate applies
 * when replacing those rows. A first offer (nothing to replace) is not a
 * de-commit.
 */
export function offerReplaceNeedsReason(input: {
  insideFirmFence: boolean;
  replacingOffered: boolean;
  splits: Array<{ reasonCode?: string | null }>;
}): boolean {
  if (!input.insideFirmFence || !input.replacingOffered) return false;
  return input.splits.some((split) => !split.reasonCode?.trim());
}

export function weeksToNeedBy(isoDate: string, nowMs: number): number {
  return (Date.parse(`${isoDate}T00:00:00Z`) - nowMs) / 86_400_000 / 7;
}

export function isInsideFirmFence(
  firmFenceWeeks: number,
  requestedDate: string,
  nowMs: number,
): boolean {
  return weeksToNeedBy(requestedDate, nowMs) < firmFenceWeeks;
}
