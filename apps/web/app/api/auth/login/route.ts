import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const data = (await upstream.json().catch(() => ({}))) as {
    token?: string;
    user?: unknown;
    message?: string | string[];
  };
  if (!upstream.ok || !data.token) {
    return NextResponse.json(data, { status: upstream.status || 401 });
  }
  const res = NextResponse.json({ user: data.user });
  res.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
