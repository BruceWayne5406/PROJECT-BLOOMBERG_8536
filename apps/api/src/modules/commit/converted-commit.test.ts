import assert from "node:assert/strict";
import { test } from "node:test";
import {
  convertedCommitBlocksSupersede,
  supersedeAfterConvertMessage,
} from "./converted-commit";

test("FC-88421 CM-01 after convert to PO-88421 cannot be superseded", () => {
  assert.equal(convertedCommitBlocksSupersede(true), true);
  assert.equal(
    supersedeAfterConvertMessage({
      commitId: "CM-01",
      poNumber: "PO-88421",
      line: "10",
      scheduleLine: "1",
    }),
    "CM-01 is already schedule PO-88421/10/1. Post-convert amendments must use a change order",
  );
});

test("an accepted CM-01 with no PO can still be superseded before convert", () => {
  assert.equal(convertedCommitBlocksSupersede(false), false);
});

test("offered CM-02 / CM-GAP without a schedule line are not blocked", () => {
  assert.equal(convertedCommitBlocksSupersede(false), false);
});
