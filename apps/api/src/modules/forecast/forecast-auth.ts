import { ForbiddenException } from "@nestjs/common";
import type { SessionClaims } from "../auth/token";

export function assertBuyerSession(user: SessionClaims | undefined): asserts user is SessionClaims {
  if (!user) throw new ForbiddenException("Sign in required");
  if (user.partyType !== "buyer") {
    throw new ForbiddenException("Only the buying partner can publish or republish a forecast");
  }
}

export function assertForecastPublisher(user: SessionClaims | undefined, buyerId: string) {
  assertBuyerSession(user);
  if (user.partnerId !== buyerId) {
    throw new ForbiddenException("Only the buying partner can publish or republish a forecast");
  }
}
