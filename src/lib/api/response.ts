import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";
import { AhpComputationError, SawComputationError } from "@/lib/decision";
import { RepositoryError } from "@/lib/repositories";

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    {
      data,
      error: null,
      meta: meta ?? {},
    },
    { status },
  );
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    {
      data: null,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      meta: {},
    },
    { status },
  );
}

export function handleRouteError(err: unknown) {
  if (err instanceof AuthError) {
    return apiError(err.status, err.code, err.message);
  }
  if (err instanceof RepositoryError) {
    return apiError(err.status, err.code, err.message);
  }
  if (err instanceof AhpComputationError || err instanceof SawComputationError) {
    return apiError(422, err.code, err.message);
  }
  if (err instanceof ZodError) {
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Data masukan tidak memenuhi aturan validasi.",
      err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  console.error("[LaptopMatch API Error]", err instanceof Error ? err.message : "Unknown error");
  return apiError(
    500,
    "INTERNAL_ERROR",
    "Terjadi kesalahan internal pada server. Silakan coba beberapa saat lagi.",
  );
}
