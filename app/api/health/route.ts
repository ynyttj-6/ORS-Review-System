import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { isProductionMode } from "@/lib/env";

export async function GET() {
  if (!isProductionMode()) return NextResponse.json({ status: "ok", mode: "demo", database: "not-required" });
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", mode: "production", database: "connected" });
  } catch (error) {
    console.error("[health] production dependency check failed", error);
    return NextResponse.json({ status: "degraded", mode: "production", database: "unavailable" }, { status: 503 });
  }
}
