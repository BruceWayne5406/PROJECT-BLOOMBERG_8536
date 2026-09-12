import { cookies } from "next/headers";
import { API_URL, SESSION_COOKIE } from "@/lib/session";

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const incoming = new URL(req.url);
  const target = `${API_URL}/${path.join("/")}${incoming.search}`;
  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  const upstream = await fetch(target, { method: req.method, headers, body });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
