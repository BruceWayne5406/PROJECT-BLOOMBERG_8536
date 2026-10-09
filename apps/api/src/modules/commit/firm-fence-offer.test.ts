import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isInsideFirmFence,
  offerReplaceNeedsReason,
} from "./firm-fence-offer";

/** Seed TPA firmFenceWeeks = 13; FC-88421 dock 15 Dec 2026. */
const FIRM_FENCE_WEEKS = 13;
const FC_88421_DOCK = "2026-12-15";
const OCT_9 = Date.parse("2026-10-09T11:12:00Z");
const AUG_1 = Date.parse("2026-08-01T00:00:00Z");

const noReasons = [
  { committedQty: "1000", committedDate: "2026-12-15", reasonCode: null },
];
const allReasoned = [
  { committedQty: "40000", committedDate: "2026-12-08", reasonCode: "CAPACITY" },
  { committedQty: "0", committedDate: null, reasonCode: "CAPACITY" },
];

test("FC-88421 on 9 Oct 2026 is inside the 13-week firm fence", () => {
  assert.equal(isInsideFirmFence(FIRM_FENCE_WEEKS, FC_88421_DOCK, OCT_9), true);
});

test("Excel one-row 1000 without reason_code cannot replace offered CM-01/02/03/GAP inside the fence", () => {
  const needs = offerReplaceNeedsReason({
    insideFirmFence: isInsideFirmFence(FIRM_FENCE_WEEKS, FC_88421_DOCK, OCT_9),
    replacingOffered: true,
    splits: noReasons,
  });
  assert.equal(needs, true);
});

test("portal Publish splits with empty reasons on every row is a silent de-commit", () => {
  const needs = offerReplaceNeedsReason({
    insideFirmFence: true,
    replacingOffered: true,
    splits: [
      { reasonCode: null },
      { reasonCode: "" },
      { reasonCode: null },
      { reasonCode: null },
    ],
  });
  assert.equal(needs, true);
});

test("a replacement that documents every split with a reason_code is allowed", () => {
  const needs = offerReplaceNeedsReason({
    insideFirmFence: true,
    replacingOffered: true,
    splits: allReasoned,
  });
  assert.equal(needs, false);
});

test("first offer against an unanswered forecast does not need a de-commit reason", () => {
  const needs = offerReplaceNeedsReason({
    insideFirmFence: true,
    replacingOffered: false,
    splits: noReasons,
  });
  assert.equal(needs, false);
});

test("outside the firm fence, replacing offered splits without a reason is still allowed", () => {
  assert.equal(isInsideFirmFence(FIRM_FENCE_WEEKS, FC_88421_DOCK, AUG_1), false);
  const needs = offerReplaceNeedsReason({
    insideFirmFence: isInsideFirmFence(FIRM_FENCE_WEEKS, FC_88421_DOCK, AUG_1),
    replacingOffered: true,
    splits: noReasons,
  });
  assert.equal(needs, false);
});

test("a remainder reason on one row does not cover sibling de-commits", () => {
  const needs = offerReplaceNeedsReason({
    insideFirmFence: true,
    replacingOffered: true,
    splits: [
      { reasonCode: null },
      { reasonCode: "CAPACITY" },
    ],
  });
  assert.equal(needs, true);
});
