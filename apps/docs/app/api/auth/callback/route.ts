import { accounts } from "@/lib/accounts-auth";

export async function GET(request: Request) {
  if (!accounts) {
    return Response.json(
      { error: "Sign-in is not configured on this deployment." },
      { status: 503 },
    );
  }
  return accounts.handlers.callback(request);
}
