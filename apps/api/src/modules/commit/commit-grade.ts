import type { CommitGrade } from "@scp/domain";

export type GradeBand = {
  weeksToNeedByMin: number | null;
  weeksToNeedByMax: number | null;
  commitGrade: CommitGrade;
};

/**
 * TPA flexibility bands are integer week indexes (0–5 frozen, 6–12 firming, …).
 * Compare against the floor of weeks-to-need-by so a date 12.7 weeks out still
 * matches the week-12 band instead of falling through the 12–13 gap to planning.
 * Past-due dates sit inside the frozen fence (week 0), not in a gap below 0.
 */
export function weeksToNeedByIndex(isoDate: string, nowMs = Date.now()): number {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) - nowMs;
  return Math.max(0, Math.floor(ms / 86_400_000 / 7));
}

export function suggestCommitGrade(
  bands: GradeBand[],
  needBy: string,
  nowMs = Date.now(),
): CommitGrade {
  const weeks = weeksToNeedByIndex(needBy, nowMs);
  const match = bands.find((b) => {
    const min = b.weeksToNeedByMin ?? Number.NEGATIVE_INFINITY;
    const max = b.weeksToNeedByMax ?? Number.POSITIVE_INFINITY;
    return weeks >= min && weeks <= max;
  });
  return match?.commitGrade ?? "planning";
}
