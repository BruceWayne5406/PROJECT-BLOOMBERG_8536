import type { CommitGrade } from "@scp/domain";

/**
 * A qty without a date is a capacity signal, not a schedule promise.
 * Never infer firming/frozen from the parent forecast's need-by when the
 * split itself has no committed_date — that paints the row as binding and
 * the convert-to-PO path then rejects it.
 */
export function resolveOfferedGrade(
  explicit: CommitGrade | null | undefined,
  qty: number,
  date: string | null | undefined,
  suggest: (needBy: string) => CommitGrade,
): CommitGrade | null {
  if (explicit) return explicit;
  if (!(qty > 0)) return null;
  if (!date) return "planning";
  return suggest(date);
}
