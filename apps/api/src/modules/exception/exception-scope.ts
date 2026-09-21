import type { ExceptionType } from "@scp/domain";

/**
 * SLA silence and gap are facts about one published forecast line.
 * They must not be keyed by a remainder split's commit id — that id changes
 * whenever the supplier replaces offered rows, which would orphan the
 * exception and leave a filled gap open forever.
 *
 * Late is per split: a commit can be late independently of its siblings.
 */
export function exceptionLookupCommitId(
  type: ExceptionType,
  commitId: string | null,
): string | null | undefined {
  if (type === "late") return commitId;
  return undefined;
}

export function isLineScopedException(type: ExceptionType): boolean {
  return type === "gap" || type === "sla_silence";
}
