import { NextResponse, type NextRequest } from "next/server";
import { accounts } from "@/lib/accounts-auth";

// POST only: next/link prefetches links in the viewport, so a GET logout would
// sign the visitor out on page load.
export async function POST(request: NextRequest) {
  if (!accounts) return NextResponse.redirect(new URL("/", request.url));
  return accounts.handlers.logout(request);
}
