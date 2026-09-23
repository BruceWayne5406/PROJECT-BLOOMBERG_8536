/** Commits stay attached to the forecast line they were offered against.
 * After republish that line is superseded; only the new published row is live. */

export function unpublishedLineBlocker(
  line: { forecastId: string; version: number; status: string },
  action: string,
): string | null {
  if (line.status === "published") return null;
  return `${line.forecastId} v${line.version} is ${line.status}; ${action} is only allowed on the current published version`;
}
