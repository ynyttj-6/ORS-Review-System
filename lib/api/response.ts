import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "提交数据不符合要求", details: error.issues }, { status: 400 });
  }
  console.error("[ORS API]", error);
  return NextResponse.json({ error: "服务器处理失败，请稍后重试" }, { status: 500 });
}
