import { NextResponse } from "next/server";
import { API_URL } from "@/lib/session";

export async function GET() {
  const upstream = await fetch(`${API_URL}/auth/organizations`, { cache: "no-store" });
  const data = await upstream.json().catch(() => []);
  return NextResponse.json(data, { status: upstream.status });
}
