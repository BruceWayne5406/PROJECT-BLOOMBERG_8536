/**
 * Exceptions are facts about the current published forecast line.
 * Republish supersedes the prior line (new UUID, new version). The scanner
 * only walks status=published rows, so gap/SLA/late rows keyed to the old
 * lineId would stay open forever unless we resolve them explicitly.
 */
export function isCurrentExceptionLine(lineStatus: string | null | undefined): boolean {
  return lineStatus === "published";
}
