import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAcceptedChangeOrderPromise } from "./change-order-promise";

const po = {
  firmQty: "100000.0000",
  firmDate: "2026-12-15",
};

const lastAck = {
  lastPromiseQty: "100000.0000",
  lastPromiseDate: "2026-12-20",
};

test("qty-only change order keeps the last accepted promise date", () => {
  const result = resolveAcceptedChangeOrderPromise({
    proposedQty: "90000.0000",
    proposedDate: null,
    ...lastAck,
    ...po,
  });
  assert.equal(result.promiseQty, "90000.0000");
  assert.equal(result.promiseDate, "2026-12-20");
});

test("date-only change order keeps the last accepted promise qty", () => {
  const result = resolveAcceptedChangeOrderPromise({
    proposedQty: null,
    proposedDate: "2026-12-22",
    lastPromiseQty: "88000.0000",
    lastPromiseDate: "2026-12-20",
    ...po,
  });
  assert.equal(result.promiseQty, "88000.0000");
  assert.equal(result.promiseDate, "2026-12-22");
});

test("with no prior acknowledgement, unspecified fields fall back to the PO firm schedule", () => {
  const result = resolveAcceptedChangeOrderPromise({
    proposedQty: "90000.0000",
    proposedDate: null,
    lastPromiseQty: null,
    lastPromiseDate: null,
    ...po,
  });
  assert.equal(result.promiseQty, "90000.0000");
  assert.equal(result.promiseDate, "2026-12-15");
});

test("explicit qty and date on the change order win over the last promise", () => {
  const result = resolveAcceptedChangeOrderPromise({
    proposedQty: "75000.0000",
    proposedDate: "2027-01-05",
    ...lastAck,
    ...po,
  });
  assert.equal(result.promiseQty, "75000.0000");
  assert.equal(result.promiseDate, "2027-01-05");
});
