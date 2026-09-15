import assert from "node:assert/strict";
import { test } from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { assertBuyerSession, assertForecastPublisher } from "./forecast-auth";
import type { SessionClaims } from "../auth/token";

const buyerId = "11111111-1111-4111-8111-111111111111";
const otherBuyerId = "99999999-9999-4999-8999-999999999999";

function user(partial: Partial<SessionClaims>): SessionClaims {
  return {
    sub: "buyer.planner.seed",
    email: "planner@northstar.example",
    displayName: "Buyer planner",
    partyType: "buyer",
    partnerId: buyerId,
    role: "planner",
    ...partial,
  };
}

test("buyer of the TPA can publish", () => {
  assert.doesNotThrow(() => assertForecastPublisher(user({}), buyerId));
});

test("unsigned request is rejected", () => {
  assert.throws(() => assertForecastPublisher(undefined, buyerId), ForbiddenException);
});

test("non-buyer sessions are rejected before a TPA lookup", () => {
  assert.throws(
    () =>
      assertBuyerSession(
        user({
          sub: "supplier.planner.seed",
          partyType: "supplier",
          partnerId: "22222222-2222-4222-8222-222222222222",
        }),
      ),
    ForbiddenException,
  );
});

test("supplier cannot publish or republish a forecast", () => {
  assert.throws(
    () =>
      assertForecastPublisher(
        user({
          sub: "supplier.planner.seed",
          partyType: "supplier",
          partnerId: "22222222-2222-4222-8222-222222222222",
        }),
        buyerId,
      ),
    (err: unknown) => {
      assert.ok(err instanceof ForbiddenException);
      assert.match(String((err as ForbiddenException).message), /buying partner/i);
      return true;
    },
  );
});

test("a different buyer cannot publish for this TPA", () => {
  assert.throws(
    () => assertForecastPublisher(user({ partnerId: otherBuyerId }), buyerId),
    ForbiddenException,
  );
});
