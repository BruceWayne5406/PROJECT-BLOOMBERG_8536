import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveBindingPromise, resolveOtif } from "./otif";

const po = { firmQty: "100000.0000", firmDate: "2026-12-15" };

test("receipt against an unacked PO is on time vs the firm date", () => {
  const promise = resolveBindingPromise(po, []);
  assert.equal(promise.promiseDate, "2026-12-15");
  assert.equal(promise.promiseQty, "100000.0000");
  const otif = resolveOtif(promise.promiseDate, [
    { eventType: "receipt", qty: "100000.0000", occurredAt: "2026-12-15T18:00:00.000Z" },
  ]);
  assert.equal(otif?.otif, true);
  assert.equal(otif?.receiptDate, "2026-12-15");
});

test("receipt after the firm date with no ack is late vs that promise", () => {
  const promise = resolveBindingPromise(po, []);
  const otif = resolveOtif(promise.promiseDate, [
    { eventType: "receipt", qty: "100000.0000", occurredAt: "2026-12-16T08:00:00.000Z" },
  ]);
  assert.equal(otif?.otif, false);
});

test("no receipt means OTIF is unknown, not a miss", () => {
  const promise = resolveBindingPromise(po, []);
  assert.equal(resolveOtif(promise.promiseDate, []), null);
  assert.equal(
    resolveOtif(promise.promiseDate, [
      { eventType: "asn", qty: "100000.0000", occurredAt: "2026-12-14T00:00:00.000Z" },
    ]),
    null,
  );
});

test("an 855 date_change is the last accepted promise, not the original firm date", () => {
  const promise = resolveBindingPromise(po, [
    {
      ackStatus: "accepted",
      promiseQty: "100000.0000",
      promiseDate: "2026-12-15",
      acknowledgedAt: "2026-10-01T00:00:00.000Z",
    },
    {
      ackStatus: "date_change",
      promiseQty: "100000.0000",
      promiseDate: "2026-12-20",
      acknowledgedAt: "2026-10-02T00:00:00.000Z",
    },
  ]);
  assert.equal(promise.promiseDate, "2026-12-20");
  const otif = resolveOtif(promise.promiseDate, [
    { eventType: "receipt", qty: "100000.0000", occurredAt: "2026-12-18T12:00:00.000Z" },
  ]);
  assert.equal(otif?.otif, true);
});

test("a rejected acknowledgement is not a promise and does not rewind the last accepted date", () => {
  const promise = resolveBindingPromise(po, [
    {
      ackStatus: "accepted",
      promiseQty: "100000.0000",
      promiseDate: "2026-12-20",
      acknowledgedAt: "2026-10-01T00:00:00.000Z",
    },
    {
      ackStatus: "rejected",
      promiseQty: "0.0000",
      promiseDate: "2026-12-01",
      acknowledgedAt: "2026-10-03T00:00:00.000Z",
    },
  ]);
  assert.equal(promise.promiseDate, "2026-12-20");
  assert.equal(promise.promiseQty, "100000.0000");
});

test("a rejected ack with no prior ack falls back to the PO firm schedule", () => {
  const promise = resolveBindingPromise(po, [
    {
      ackStatus: "rejected",
      promiseQty: "0.0000",
      promiseDate: "2026-12-01",
      acknowledgedAt: "2026-10-03T00:00:00.000Z",
    },
  ]);
  assert.equal(promise.promiseDate, "2026-12-15");
  assert.equal(promise.promiseQty, "100000.0000");
});
