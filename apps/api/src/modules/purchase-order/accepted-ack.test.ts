import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acceptedMatchesBinding, currentBindingPromise } from "./accepted-ack";

const po = { firmQty: "40000.0000", firmDate: "2026-12-08" };

describe("currentBindingPromise", () => {
  it("uses convert-time firm qty/date when there is no acknowledgement", () => {
    const binding = currentBindingPromise(po, []);
    assert.deepEqual(binding, { promiseQty: "40000.0000", promiseDate: "2026-12-08" });
  });

  it("ignores a rejected 855 so accept-as-is still confirms the firm schedule", () => {
    const binding = currentBindingPromise(po, [
      {
        ackStatus: "rejected",
        promiseQty: "40000.0000",
        promiseDate: "2026-12-31",
        acknowledgedAt: "2026-10-02T10:00:00.000Z",
      },
    ]);
    assert.deepEqual(binding, { promiseQty: "40000.0000", promiseDate: "2026-12-08" });
  });

  it("treats the last date_change as the binding promise, not the original firm date", () => {
    const binding = currentBindingPromise(po, [
      {
        ackStatus: "accepted",
        promiseQty: "40000.0000",
        promiseDate: "2026-12-08",
        acknowledgedAt: "2026-10-01T10:00:00.000Z",
      },
      {
        ackStatus: "date_change",
        promiseQty: "40000.0000",
        promiseDate: "2026-12-22",
        acknowledgedAt: "2026-10-03T10:00:00.000Z",
      },
    ]);
    assert.deepEqual(binding, { promiseQty: "40000.0000", promiseDate: "2026-12-22" });
  });
});

describe("acceptedMatchesBinding", () => {
  it("allows an accepted 855 that confirms the firm schedule", () => {
    const binding = currentBindingPromise(po, []);
    assert.equal(
      acceptedMatchesBinding({ promiseQty: "40000", promiseDate: "2026-12-08" }, binding),
      true,
    );
  });

  it("rejects an accepted 855 that silently moves the date", () => {
    const binding = currentBindingPromise(po, []);
    assert.equal(
      acceptedMatchesBinding({ promiseQty: "40000", promiseDate: "2026-12-31" }, binding),
      false,
    );
  });

  it("rejects an accepted 855 that silently cuts the qty", () => {
    const binding = currentBindingPromise(po, []);
    assert.equal(
      acceptedMatchesBinding({ promiseQty: "10000", promiseDate: "2026-12-08" }, binding),
      false,
    );
  });

  it("allows a later accepted 855 that confirms a date_change, not the original firm date", () => {
    const binding = currentBindingPromise(po, [
      {
        ackStatus: "date_change",
        promiseQty: "40000.0000",
        promiseDate: "2026-12-22",
        acknowledgedAt: "2026-10-03T10:00:00.000Z",
      },
    ]);
    assert.equal(
      acceptedMatchesBinding({ promiseQty: "40000", promiseDate: "2026-12-22" }, binding),
      true,
    );
    assert.equal(
      acceptedMatchesBinding({ promiseQty: "40000", promiseDate: "2026-12-08" }, binding),
      false,
    );
  });
});
