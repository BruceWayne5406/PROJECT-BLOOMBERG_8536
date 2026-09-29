import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveExcelForecastWrite } from "./excel-forecast-write";

const NORTHSTAR = "11111111-1111-4111-8111-111111111111";
const OTHER_BUYER = "99999999-9999-4999-8999-999999999999";

test("a new row without forecast_id publishes a new id", () => {
  const write = resolveExcelForecastWrite(undefined, null, NORTHSTAR);
  assert.equal(write.mode, "publish");
});

test("an unused forecast_id still publishes (does not invent a match)", () => {
  const write = resolveExcelForecastWrite("FC-99999", null, NORTHSTAR);
  assert.equal(write.mode, "publish");
});

test("FC-88421 on a subsequent sheet must republish, not create a sibling live line", () => {
  const write = resolveExcelForecastWrite(
    "FC-88421",
    { buyerId: NORTHSTAR },
    NORTHSTAR,
  );
  assert.equal(write.mode, "republish");
});

test("a buyer cannot republish another partner's forecast_id via Excel", () => {
  const write = resolveExcelForecastWrite(
    "FC-88421",
    { buyerId: NORTHSTAR },
    OTHER_BUYER,
  );
  assert.equal(write.mode, "reject");
  if (write.mode === "reject") {
    assert.match(write.message, /another buying partner/);
  }
});
