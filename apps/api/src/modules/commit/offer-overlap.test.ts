import assert from "node:assert/strict";
import { test } from "node:test";
import { offerRepeatsAcceptedSplit } from "./offer-overlap";

const acceptedCm01 = [{ committedQty: "40000.0000", committedDate: "2026-12-08" }];

test("stale FC-88421 draft that still includes accepted CM-01 is rejected", () => {
  const repeats = offerRepeatsAcceptedSplit({
    accepted: acceptedCm01,
    replaceableIds: ["CM-02", "CM-03", "CM-GAP"],
    incoming: [
      { committedQty: "40000", committedDate: "2026-12-08" },
      { committedQty: "35000", committedDate: "2026-12-15" },
      { committedQty: "15000", committedDate: "2027-01-12" },
      { committedQty: "0", committedDate: null },
    ],
  });
  assert.equal(repeats, true);
});

test("replacing only the remaining offered slices is allowed", () => {
  const repeats = offerRepeatsAcceptedSplit({
    accepted: acceptedCm01,
    replaceableIds: ["CM-02", "CM-03", "CM-GAP"],
    incoming: [
      { commitId: "CM-02", committedQty: "35000", committedDate: "2026-12-22" },
      { commitId: "CM-03", committedQty: "15000", committedDate: "2027-01-12" },
      { commitId: "CM-GAP", committedQty: "0", committedDate: null },
    ],
  });
  assert.equal(repeats, false);
});

test("a new split on a different date is not a repeat of the accepted slice", () => {
  const repeats = offerRepeatsAcceptedSplit({
    accepted: acceptedCm01,
    replaceableIds: ["CM-02"],
    incoming: [
      { commitId: "CM-02", committedQty: "35000", committedDate: "2026-12-15" },
      { committedQty: "10000", committedDate: "2026-12-29" },
    ],
  });
  assert.equal(repeats, false);
});
