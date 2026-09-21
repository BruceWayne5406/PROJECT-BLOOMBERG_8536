import assert from "node:assert/strict";
import { test } from "node:test";
import { exceptionLookupCommitId, isLineScopedException } from "./exception-scope";

test("gap is line-scoped so a remainder commit id is not the lookup key", () => {
  assert.equal(isLineScopedException("gap"), true);
  assert.equal(exceptionLookupCommitId("gap", "CM-GAP"), undefined);
  assert.equal(exceptionLookupCommitId("gap", null), undefined);
});

test("sla_silence is line-scoped", () => {
  assert.equal(isLineScopedException("sla_silence"), true);
  assert.equal(exceptionLookupCommitId("sla_silence", null), undefined);
});

test("late stays keyed to the split that is actually late", () => {
  assert.equal(isLineScopedException("late"), false);
  assert.equal(exceptionLookupCommitId("late", "CM-03"), "CM-03");
  assert.equal(exceptionLookupCommitId("late", null), null);
});
