import { NextResponse, type NextRequest } from "next/server";
import { accounts } from "@/lib/accounts-auth";

// POST only: next/link prefetches links in the viewport, so a GET logout would
// sign the visitor out on page load.
export async function POST(request: NextRequest) {
  // 303 so the browser follows with GET; 307 would replay the POST on a page
  // that only answers GET.
  if (!accounts) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }
  return accounts.handlers.logout(request);
}
