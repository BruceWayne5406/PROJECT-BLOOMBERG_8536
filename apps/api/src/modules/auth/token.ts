import { SignJWT, jwtVerify } from "jose";

export type SessionClaims = {
  sub: string;
  email: string;
  displayName: string;
  partyType: "buyer" | "supplier";
  partnerId: string | null;
  role: "planner" | "procurement";
};

function secret() {
  const value = process.env.AUTH_SECRET ?? "scp-dev-auth-secret-change-me";
  return new TextEncoder().encode(value);
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as SessionClaims;
}
