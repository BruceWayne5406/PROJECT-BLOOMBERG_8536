import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { latestBindingAck } from "./binding-promise";

describe("latestBindingAck", () => {
  it("skips a later rejected 855 so OTIF keeps the accepted promise", () => {
    const accepted = {
      ackStatus: "accepted" as const,
      acknowledgedAt: "2026-10-01T10:00:00.000Z",
      promiseDate: "2026-12-08",
      promiseQty: "40000",
    };
    const rejected = {
      ackStatus: "rejected" as const,
      acknowledgedAt: "2026-10-02T10:00:00.000Z",
      promiseDate: "2026-12-31",
      promiseQty: "40000",
    };

    const latest = latestBindingAck([rejected, accepted]);
    assert.equal(latest, accepted);
  });

  it("keeps a date_change acknowledgement as the binding promise", () => {
    const accepted = {
      ackStatus: "accepted" as const,
      acknowledgedAt: "2026-10-01T10:00:00.000Z",
    };
    const slipped = {
      ackStatus: "date_change" as const,
      acknowledgedAt: "2026-10-03T10:00:00.000Z",
    };

    const latest = latestBindingAck([accepted, slipped]);
    assert.equal(latest, slipped);
  });

  it("returns null when the only acknowledgements are rejections", () => {
    const latest = latestBindingAck([
      {
        ackStatus: "rejected",
        acknowledgedAt: "2026-10-02T10:00:00.000Z",
      },
    ]);
    assert.equal(latest, null);
  });
});
