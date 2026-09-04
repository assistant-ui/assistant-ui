import { NextResponse, type NextRequest } from "next/server";

const OPT_IN_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "GB",
  "CH",
]);

export function GET(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country");
  const required = country === null || OPT_IN_COUNTRIES.has(country);
  // The answer varies by the caller's country, so a shared cache anywhere on
  // the path would hand one region's verdict to another.
  return NextResponse.json(
    { required },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
