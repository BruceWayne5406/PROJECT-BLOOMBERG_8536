/**
 * POST /forecasts/:id/commits replaces every offered split with the payload.
 * A commits sheet that names commit_id values is a correction, not a snapshot.
 * Keep offered siblings that the sheet did not mention so a single-row import
 * cannot wipe FC-88421's other live slices.
 *
 * A sheet with no commit_id column is still a full replace, matching the portal.
 */
export type IncomingCommitSplit = {
  commitId?: string;
  committedQty: unknown;
  committedDate?: unknown;
  commitGrade?: unknown;
  reasonCode?: unknown;
  comment?: unknown;
};

export type OfferedCommitSplit = {
  commitId: string;
  committedQty: string;
  committedDate: string | null;
  commitGrade: string | null;
  reasonCode: string | null;
  comment: string | null;
};

export function mergeExcelCommitSplits(
  existingOffered: OfferedCommitSplit[],
  incoming: IncomingCommitSplit[],
): IncomingCommitSplit[] {
  const namesExisting = incoming.some((row) => Boolean(row.commitId));
  if (!namesExisting) return incoming;

  const incomingIds = new Set(
    incoming
      .map((row) => (typeof row.commitId === "string" ? row.commitId.toUpperCase() : ""))
      .filter(Boolean),
  );
  const kept = existingOffered
    .filter((row) => !incomingIds.has(row.commitId.toUpperCase()))
    .map((row) => ({
      commitId: row.commitId,
      committedQty: row.committedQty,
      committedDate: row.committedDate,
      commitGrade: row.commitGrade,
      reasonCode: row.reasonCode,
      comment: row.comment,
    }));
  return [...kept, ...incoming];
}
