import { NextResponse } from "next/server";
import { isNextFlowApiError, InternalServerError } from "@/lib/error/error";

export function NextFlowApiResponse<T>(
  status: number,
  message: string,
  data?: T,
) {
  return NextResponse.json(
    { success: true, message, data: data ?? null },
    { status },
  );
}

export function NextFlowApiError(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

export function _Error(error: unknown) {
  console.error("[NextFlow API Error]", error);

  if (isNextFlowApiError(error)) {
    return NextFlowApiError(error.statusCode, error.message);
  }

  const fallback = new InternalServerError();
  return NextFlowApiError(fallback.statusCode, fallback.message);
}
