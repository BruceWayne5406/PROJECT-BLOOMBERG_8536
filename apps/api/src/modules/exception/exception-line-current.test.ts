import assert from "node:assert/strict";
import { test } from "node:test";
import { isCurrentExceptionLine } from "./exception-line-current";

test("published demand keeps its exceptions current", () => {
  assert.equal(isCurrentExceptionLine("published"), true);
});

test("republish supersedes the prior line so its gap/SLA/late must resolve", () => {
  assert.equal(isCurrentExceptionLine("superseded"), false);
});

test("a draft line is not live demand", () => {
  assert.equal(isCurrentExceptionLine("draft"), false);
  assert.equal(isCurrentExceptionLine(null), false);
});
