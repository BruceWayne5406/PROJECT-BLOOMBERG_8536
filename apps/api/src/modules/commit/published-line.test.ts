import assert from "node:assert/strict";
import { test } from "node:test";
import { unpublishedLineBlocker } from "./published-line";

const published = { forecastId: "FC-88421", version: 2, status: "published" };
const superseded = { forecastId: "FC-88421", version: 1, status: "superseded" };
const draft = { forecastId: "FC-88421", version: 1, status: "draft" };

test("published forecast lines stay actionable", () => {
  assert.equal(unpublishedLineBlocker(published, "accept"), null);
  assert.equal(unpublishedLineBlocker(published, "convert to a PO"), null);
  assert.equal(unpublishedLineBlocker(published, "supersede"), null);
});

test("superseded FC-88421 v1 cannot be accepted, converted, or superseded", () => {
  assert.match(
    unpublishedLineBlocker(superseded, "accept") ?? "",
    /FC-88421 v1 is superseded/,
  );
  assert.match(
    unpublishedLineBlocker(superseded, "convert to a PO") ?? "",
    /only allowed on the current published version/,
  );
  assert.match(
    unpublishedLineBlocker(superseded, "supersede") ?? "",
    /FC-88421 v1 is superseded/,
  );
});

test("draft lines are not a live demand signal", () => {
  assert.match(unpublishedLineBlocker(draft, "accept") ?? "", /v1 is draft/);
});
