import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAckFormSeed } from "@scp/domain";

const po = { firmQty: "40000.0000", firmDate: "2026-12-08" };

test("unacked PO seeds the firm schedule", () => {
  const seed = resolveAckFormSeed({ ...po, acknowledgements: [] });
  assert.equal(seed.promiseQty, "40000");
  assert.equal(seed.promiseDate, "2026-12-08");
});

test("a date_change ack is the default, not the original firm date", () => {
  const seed = resolveAckFormSeed({
    ...po,
    acknowledgements: [
      {
        ackStatus: "date_change",
        promiseQty: "40000.0000",
        promiseDate: "2026-12-20",
      },
    ],
  });
  assert.equal(seed.promiseDate, "2026-12-20");
  assert.equal(seed.promiseQty, "40000");
});

test("an accepted change-order ack (qty + date) is not rewound to firm", () => {
  const seed = resolveAckFormSeed({
    ...po,
    acknowledgements: [
      {
        ackStatus: "date_change",
        promiseQty: "35000.0000",
        promiseDate: "2026-12-22",
      },
      {
        ackStatus: "accepted",
        promiseQty: "40000.0000",
        promiseDate: "2026-12-08",
      },
    ],
  });
  assert.equal(seed.promiseQty, "35000");
  assert.equal(seed.promiseDate, "2026-12-22");
});

test("a rejected ack is not a promise and does not hide the prior accepted date", () => {
  const seed = resolveAckFormSeed({
    ...po,
    acknowledgements: [
      {
        ackStatus: "rejected",
        promiseQty: "0.0000",
        promiseDate: "2026-12-01",
      },
      {
        ackStatus: "accepted",
        promiseQty: "40000.0000",
        promiseDate: "2026-12-20",
      },
    ],
  });
  assert.equal(seed.promiseDate, "2026-12-20");
  assert.equal(seed.promiseQty, "40000");
});

test("a rejected ack with no prior ack falls back to the firm schedule", () => {
  const seed = resolveAckFormSeed({
    ...po,
    acknowledgements: [
      {
        ackStatus: "rejected",
        promiseQty: "0.0000",
        promiseDate: "2026-12-01",
      },
    ],
  });
  assert.equal(seed.promiseDate, "2026-12-08");
  assert.equal(seed.promiseQty, "40000");
});
