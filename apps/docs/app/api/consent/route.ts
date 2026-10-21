import { NextResponse, type NextRequest } from "next/server";
import { consentRequiredFor } from "@/lib/consent-region";

export function GET(req: NextRequest) {
  const required = consentRequiredFor(req.headers.get("x-vercel-ip-country"));
  // The answer varies by the caller's country, so a shared cache anywhere on
  // the path would hand one region's verdict to another.
  return NextResponse.json(
    { required },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
