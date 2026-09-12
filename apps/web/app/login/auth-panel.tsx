"use client";

import { AUTH_PARTY_TYPES, USER_ROLES } from "@scp/domain";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Org = {
  id: string;
  partyType: "buyer" | "supplier";
  partnerId: string;
  name: string;
};

function errorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message: string | string[] }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

export function AuthPanel() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/forecasts";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [partyType, setPartyType] = useState<(typeof AUTH_PARTY_TYPES)[number]>("buyer");
  const [partnerId, setPartnerId] = useState("");
  const [role, setRole] = useState<(typeof USER_ROLES)[number]>("planner");

  const orgs = useQuery({
    queryKey: ["auth-orgs"],
    queryFn: async () => {
      const res = await fetch("/api/auth/organizations");
      if (!res.ok) throw new Error("Could not load organizations");
      return res.json() as Promise<Org[]>;
    },
    enabled: mode === "signup",
  });

  const filteredOrgs = useMemo(
    () => orgs.data?.filter((o) => o.partyType === partyType) ?? [],
    [orgs.data, partyType],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const payload =
        mode === "login"
          ? { email, password }
          : {
              email,
              password,
              displayName,
              partyType,
              partnerId: partnerId || filteredOrgs[0]?.id,
              role,
            };
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorMessage(data, "Could not sign in"));
        return;
      }
      router.replace(next.startsWith("/") ? next : "/forecasts");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : undefined}
          onClick={() => {
            setMode("login");
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : undefined}
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
        >
          Create account
        </button>
      </div>

      <form className="form-grid" onSubmit={submit}>
        {mode === "signup" ? (
          <label>
            Your name
            <input
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Shown on the audit trail"
            />
          </label>
        ) : null}

        <label>
          Work email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>

        {mode === "signup" ? (
          <>
            <label>
              I represent
              <select
                value={partyType}
                onChange={(e) => {
                  setPartyType(e.target.value as (typeof AUTH_PARTY_TYPES)[number]);
                  setPartnerId("");
                }}
              >
                {AUTH_PARTY_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p === "buyer" ? "Buyer" : "Supplier"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Company (DUNS / partner)
              <select
                value={partnerId || filteredOrgs[0]?.id || ""}
                onChange={(e) => setPartnerId(e.target.value)}
                required
              >
                {filteredOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.partnerId}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Seat
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof USER_ROLES)[number])}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r === "planner" ? "Planner" : "Procurement"}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              Identity on writes is your actor ID (not your name). The company is the
              DUNS / partner record. Personal names are never used as buyer or supplier IDs.
            </p>
          </>
        ) : (
          <p className="hint">
            Demo buyer: <code>planner@northstar.example</code> / <code>Northstar2026!</code>
            <br />
            Demo supplier: <code>planner@pacific.example</code> / <code>Pacific2026!</code>
          </p>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
