import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarDateInZone, otifOnTimeVsPromise } from "./otif-timezone";

test("6pm America/Chicago on the promise date is that dock date, not the next UTC day", () => {
  // 8 Dec 2026 18:00 CST = 9 Dec 2026 00:00 UTC
  const occurredAt = "2026-12-09T00:00:00.000Z";
  assert.equal(calendarDateInZone(occurredAt, "America/Chicago"), "2026-12-08");
  assert.equal(calendarDateInZone(occurredAt, "UTC"), "2026-12-09");
});

test("OTIF is on time for an Austin evening receipt against the 8 Dec CM-01 promise", () => {
  const receiptAt = "2026-12-09T00:00:00.000Z";
  assert.equal(
    otifOnTimeVsPromise({
      promiseDate: "2026-12-08",
      receiptAt,
      timeZone: "America/Chicago",
    }),
    true,
  );
  assert.equal(
    otifOnTimeVsPromise({
      promiseDate: "2026-12-08",
      receiptAt,
      timeZone: "UTC",
    }),
    false,
  );
});

test("a receipt after midnight in the TPA timezone is late vs that dock date", () => {
  // 9 Dec 2026 00:00 CST = 9 Dec 2026 06:00 UTC
  assert.equal(
    otifOnTimeVsPromise({
      promiseDate: "2026-12-08",
      receiptAt: "2026-12-09T06:00:00.000Z",
      timeZone: "America/Chicago",
    }),
    false,
  );
});

test("missing receipt is unknown; receipt without a promise stays a miss (unacked path)", () => {
  assert.equal(
    otifOnTimeVsPromise({
      promiseDate: "2026-12-08",
      receiptAt: null,
      timeZone: "America/Chicago",
    }),
    null,
  );
  assert.equal(
    otifOnTimeVsPromise({
      promiseDate: null,
      receiptAt: "2026-12-08T18:00:00.000Z",
      timeZone: "America/Chicago",
    }),
    false,
  );
});
