import { accounts } from "@/lib/accounts-auth";

export async function GET(request: Request) {
  if (!accounts) return unavailable();
  return accounts.handlers.login(request);
}

function unavailable() {
  return Response.json(
    { error: "Sign-in is not configured on this deployment." },
    { status: 503 },
  );
}
