import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeExcelCommitSplits, type OfferedCommitSplit } from "./merge-commit-splits";

const fc88421Offered: OfferedCommitSplit[] = [
  {
    commitId: "CM-01",
    committedQty: "40000.0000",
    committedDate: "2026-12-08",
    commitGrade: "firming",
    reasonCode: null,
    comment: null,
  },
  {
    commitId: "CM-02",
    committedQty: "35000.0000",
    committedDate: "2026-12-15",
    commitGrade: "firming",
    reasonCode: null,
    comment: null,
  },
  {
    commitId: "CM-03",
    committedQty: "15000.0000",
    committedDate: "2027-01-12",
    commitGrade: "planning",
    reasonCode: "PACK",
    comment: "Backend pack slot after the requested dock date. Planning-grade only.",
  },
  {
    commitId: "CM-GAP",
    committedQty: "0.0000",
    committedDate: null,
    commitGrade: null,
    reasonCode: "CAPACITY",
    comment: "Explicit uncommitted remainder — not an implied yes.",
  },
];

test("a sheet without commit_id is a full replace", () => {
  const incoming = [
    {
      committedQty: "100000",
      committedDate: "2026-12-15",
      commitGrade: "firming",
      reasonCode: null,
      comment: null,
    },
  ];
  const merged = mergeExcelCommitSplits(fc88421Offered, incoming);
  assert.deepEqual(merged, incoming);
});

test("a single named row keeps the other FC-88421 offered slices", () => {
  const incoming = [
    {
      commitId: "CM-02",
      committedQty: "35000",
      committedDate: "2026-12-22",
      commitGrade: "firming",
      reasonCode: null,
      comment: "pack slot move",
    },
  ];
  const merged = mergeExcelCommitSplits(fc88421Offered, incoming);
  const ids = merged.map((row) => row.commitId);
  assert.deepEqual(ids.sort(), ["CM-01", "CM-02", "CM-03", "CM-GAP"]);
  const cm02 = merged.find((row) => row.commitId === "CM-02");
  assert.equal(cm02?.committedDate, "2026-12-22");
  const cm01 = merged.find((row) => row.commitId === "CM-01");
  assert.equal(cm01?.committedQty, "40000.0000");
  assert.equal(cm01?.committedDate, "2026-12-08");
});

test("naming the CAPACITY remainder does not drop the positive slices", () => {
  const incoming = [
    {
      commitId: "CM-GAP",
      committedQty: "0",
      committedDate: null,
      commitGrade: null,
      reasonCode: "MATERIAL",
      comment: "respin",
    },
  ];
  const merged = mergeExcelCommitSplits(fc88421Offered, incoming);
  assert.equal(merged.length, 4);
  assert.equal(
    merged.find((row) => row.commitId === "CM-GAP")?.reasonCode,
    "MATERIAL",
  );
  assert.equal(merged.find((row) => row.commitId === "CM-01")?.committedQty, "40000.0000");
});
