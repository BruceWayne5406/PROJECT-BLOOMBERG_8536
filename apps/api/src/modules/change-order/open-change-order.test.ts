import assert from "node:assert/strict";
import { test } from "node:test";
import {
  openProposedChangeOrderId,
  siblingProposedChangeOrders,
} from "./open-change-order";

test("PO-88421 with no change orders can accept a first proposal", () => {
  assert.equal(openProposedChangeOrderId([]), null);
});

test("a qty CO already proposed on PO-88421 blocks a second date CO", () => {
  const open = openProposedChangeOrderId([
    { changeOrderId: "CO-10001", version: 1, status: "proposed" },
  ]);
  assert.equal(open, "CO-10001");
});

test("an accepted prior amendment does not block a new proposal", () => {
  const open = openProposedChangeOrderId([
    { changeOrderId: "CO-10001", version: 1, status: "superseded" },
    { changeOrderId: "CO-10001", version: 2, status: "accepted" },
  ]);
  assert.equal(open, null);
});

test("accepting the qty CO supersedes the still-proposed date CO on the same PO", () => {
  const siblings = siblingProposedChangeOrders(
    [
      { changeOrderId: "CO-10001", version: 1, status: "proposed" },
      { changeOrderId: "CO-10002", version: 1, status: "proposed" },
    ],
    "CO-10001",
  );
  assert.deepEqual(
    siblings.map((row) => row.changeOrderId),
    ["CO-10002"],
  );
});

test("accepting a CO does not supersede an already accepted sibling", () => {
  const siblings = siblingProposedChangeOrders(
    [
      { changeOrderId: "CO-10001", version: 2, status: "accepted" },
      { changeOrderId: "CO-10002", version: 1, status: "proposed" },
    ],
    "CO-10002",
  );
  assert.equal(siblings.length, 0);
});

test("rejected or superseded rows are not treated as open", () => {
  assert.equal(
    openProposedChangeOrderId([
      { changeOrderId: "CO-10001", version: 1, status: "rejected" },
      { changeOrderId: "CO-10002", version: 1, status: "superseded" },
    ]),
    null,
  );
});

test("latest version wins when an older proposed row was superseded", () => {
  assert.equal(
    openProposedChangeOrderId([
      { changeOrderId: "CO-10001", version: 2, status: "accepted" },
      { changeOrderId: "CO-10001", version: 1, status: "superseded" },
    ]),
    null,
  );
});
