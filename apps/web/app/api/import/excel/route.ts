import { cookies } from "next/headers";
import { API_URL, SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const form = await request.formData();
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const upstream = await fetch(`${API_URL}/import/excel`, {
    method: "POST",
    headers,
    body: form,
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
