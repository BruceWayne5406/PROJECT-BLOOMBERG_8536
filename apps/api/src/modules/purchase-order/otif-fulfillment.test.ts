import assert from "node:assert/strict";
import { test } from "node:test";
import { computeOtifFulfillment } from "./otif-fulfillment";

const promise = { promiseDate: "2026-12-08", promiseQty: "40000.0000" };

test("no receipts means OTIF is unknown, not a miss", () => {
  const otif = computeOtifFulfillment(promise, [
    { eventType: "asn", qty: "40000.0000", occurredAt: "2026-12-07T00:00:00.000Z" },
  ]);
  assert.equal(otif.otif, null);
  assert.equal(otif.receivedQty, null);
});

test("a single on-time full receipt is OTIF", () => {
  const otif = computeOtifFulfillment(promise, [
    { eventType: "receipt", qty: "40000.0000", occurredAt: "2026-12-08T18:00:00.000Z" },
  ]);
  assert.equal(otif.otif, true);
  assert.equal(otif.receivedQty, "40000.0000");
  assert.equal(otif.receiptDate, "2026-12-08");
});

test("split receipts that complete on the promise date are in full", () => {
  const otif = computeOtifFulfillment(promise, [
    { eventType: "receipt", qty: "25000.0000", occurredAt: "2026-12-07T12:00:00.000Z" },
    { eventType: "receipt", qty: "15000.0000", occurredAt: "2026-12-08T09:00:00.000Z" },
  ]);
  assert.equal(otif.otif, true);
  assert.equal(otif.receivedQty, "40000.0000");
  assert.equal(otif.receiptDate, "2026-12-08");
});

test("a late completing split is not in full even though total qty matches", () => {
  const otif = computeOtifFulfillment(promise, [
    { eventType: "receipt", qty: "25000.0000", occurredAt: "2026-12-07T12:00:00.000Z" },
    { eventType: "receipt", qty: "15000.0000", occurredAt: "2026-12-09T09:00:00.000Z" },
  ]);
  assert.equal(otif.otif, false);
  assert.equal(otif.receivedQty, "40000.0000");
  assert.equal(otif.receiptDate, "2026-12-09");
});

test("an on-time full receipt stays OTIF after a later extra receipt", () => {
  const otif = computeOtifFulfillment(promise, [
    { eventType: "receipt", qty: "40000.0000", occurredAt: "2026-12-08T12:00:00.000Z" },
    { eventType: "receipt", qty: "100.0000", occurredAt: "2026-12-10T12:00:00.000Z" },
  ]);
  assert.equal(otif.otif, true);
  assert.equal(otif.receivedQty, "40100.0000");
  assert.equal(otif.receiptDate, "2026-12-10");
});

test("a receipt with no qty does not count as in-full", () => {
  const otif = computeOtifFulfillment(promise, [
    { eventType: "receipt", qty: null, occurredAt: "2026-12-08T12:00:00.000Z" },
  ]);
  assert.equal(otif.otif, false);
  assert.equal(otif.receivedQty, "0.0000");
});

test("receipts without a promise date stay non-OTIF (unacked PO)", () => {
  const otif = computeOtifFulfillment(
    { promiseDate: null, promiseQty: null },
    [{ eventType: "receipt", qty: "40000.0000", occurredAt: "2026-12-08T12:00:00.000Z" }],
  );
  assert.equal(otif.otif, false);
  assert.equal(otif.receivedQty, "40000.0000");
});
