import { NextResponse } from "next/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

async function convexMutation(name: string, args: Record<string, unknown>) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: name, args }),
  });
  if (!res.ok) throw new Error(`Convex error: ${res.status}`);
  return res.json();
}

async function convexQuery(name: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: name, args }),
  });
  if (!res.ok) throw new Error(`Convex error: ${res.status}`);
  return res.json();
}

export async function POST(req: Request) {
  if (!CONVEX_URL) {
    // Fallback: just acknowledge (no backend configured yet)
    return NextResponse.json({ status: "joined" });
  }
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const { value } = await convexMutation("waitlist:join", { email, source: "landing" });
    return NextResponse.json(value);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET() {
  if (!CONVEX_URL) {
    return NextResponse.json({ count: 0 });
  }
  try {
    const { value } = await convexQuery("waitlist:count");
    return NextResponse.json({ count: value });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
