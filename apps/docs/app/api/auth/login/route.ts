import { NextResponse, type NextRequest } from "next/server";
import { accounts } from "@/lib/accounts-auth";

export async function GET(request: NextRequest) {
  if (!accounts) return unavailable();
  return accounts.handlers.login(request);
}

function unavailable() {
  return NextResponse.json(
    { error: "Sign-in is not configured on this deployment." },
    { status: 503 },
  );
}
