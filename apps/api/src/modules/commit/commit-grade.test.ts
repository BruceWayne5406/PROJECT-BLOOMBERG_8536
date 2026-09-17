import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestCommitGrade, weeksToNeedByIndex } from "./commit-grade";

/** Seed TPA bands from packages/db/src/seed.ts */
const SEED_BANDS = [
  {
    weeksToNeedByMin: 13,
    weeksToNeedByMax: null,
    commitGrade: "planning" as const,
  },
  {
    weeksToNeedByMin: 6,
    weeksToNeedByMax: 12,
    commitGrade: "firming" as const,
  },
  {
    weeksToNeedByMin: 0,
    weeksToNeedByMax: 5,
    commitGrade: "frozen" as const,
  },
];

const MIDNIGHT = Date.parse("2026-09-17T00:00:00Z");
const DURING_DAY = Date.parse("2026-09-17T11:19:13Z");

test("FC-88421 dock 15 Dec 2026 is firming (week 12), not the 12–13 planning gap", () => {
  assert.equal(weeksToNeedByIndex("2026-12-15", MIDNIGHT), 12);
  assert.equal(suggestCommitGrade(SEED_BANDS, "2026-12-15", MIDNIGHT), "firming");
  assert.equal(suggestCommitGrade(SEED_BANDS, "2026-12-15", DURING_DAY), "firming");
});

test("need-by just over 5 weeks matches frozen week 5, not the 5–6 gap", () => {
  assert.equal(weeksToNeedByIndex("2026-10-23", MIDNIGHT), 5);
  assert.equal(suggestCommitGrade(SEED_BANDS, "2026-10-23", MIDNIGHT), "frozen");
});

test("integer week boundaries stay on the intended band", () => {
  assert.equal(suggestCommitGrade(SEED_BANDS, "2026-10-22", MIDNIGHT), "frozen");
  assert.equal(suggestCommitGrade(SEED_BANDS, "2026-10-29", MIDNIGHT), "firming");
  assert.equal(suggestCommitGrade(SEED_BANDS, "2026-12-17", MIDNIGHT), "planning");
});

test("a past-due dock date is frozen (inside the frozen fence), not planning", () => {
  assert.equal(suggestCommitGrade(SEED_BANDS, "2026-09-10", MIDNIGHT), "frozen");
  assert.equal(weeksToNeedByIndex("2026-09-10", MIDNIGHT), 0);
});

test("far-horizon demand stays planning", () => {
  assert.equal(suggestCommitGrade(SEED_BANDS, "2027-06-01", MIDNIGHT), "planning");
});
