import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", mode: "self-hosted", database: "connected" });
  } catch (error) {
    console.error("[health] local dependency check failed", error);
    return NextResponse.json({ status: "degraded", mode: "self-hosted", database: "unavailable" }, { status: 503 });
  }
}
