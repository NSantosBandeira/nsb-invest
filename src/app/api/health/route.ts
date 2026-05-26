import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const count = await db.user.count();
    return NextResponse.json({ ok: true, users: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[health] DB error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
