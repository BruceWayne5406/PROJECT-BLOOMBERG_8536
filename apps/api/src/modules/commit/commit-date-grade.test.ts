import assert from "node:assert/strict";
import { test } from "node:test";
import { commitSplitInputSchema, offerSplitsSchema, supersedeCommitSchema } from "@scp/domain";
import { resolveOfferedGrade } from "./commit-date-grade";

test("undated positive qty infers planning, not a TPA binding grade", () => {
  assert.equal(
    resolveOfferedGrade(undefined, 50_000, null, () => "frozen"),
    "planning",
  );
  assert.equal(
    resolveOfferedGrade(null, 50_000, undefined, () => "firming"),
    "planning",
  );
});

test("dated positive qty still uses the TPA suggestion", () => {
  assert.equal(
    resolveOfferedGrade(undefined, 50_000, "2026-10-15", () => "frozen"),
    "frozen",
  );
});

test("explicit grade is preserved when a date is present", () => {
  assert.equal(
    resolveOfferedGrade("planning", 50_000, "2026-10-15", () => "frozen"),
    "planning",
  );
});

test("zero-qty remainder has no grade", () => {
  assert.equal(
    resolveOfferedGrade(undefined, 0, null, () => "frozen"),
    null,
  );
});

test("schema rejects an explicit frozen/firming split with no date", () => {
  const frozen = commitSplitInputSchema.safeParse({
    committedQty: "50000",
    commitGrade: "frozen",
  });
  assert.equal(frozen.success, false);

  const firming = supersedeCommitSchema.safeParse({
    committedQty: "40000",
    commitGrade: "firming",
    committedDate: null,
  });
  assert.equal(firming.success, false);
});

test("schema allows undated planning-grade qty and an undated remainder", () => {
  const parsed = offerSplitsSchema.safeParse({
    splits: [
      { committedQty: "50000", commitGrade: null, committedDate: null },
      { committedQty: "0", reasonCode: "CAPACITY" },
    ],
  });
  assert.equal(parsed.success, true);
});

test("schema allows a dated frozen split", () => {
  const parsed = commitSplitInputSchema.safeParse({
    committedQty: "50000",
    committedDate: "2026-10-15",
    commitGrade: "frozen",
  });
  assert.equal(parsed.success, true);
});
