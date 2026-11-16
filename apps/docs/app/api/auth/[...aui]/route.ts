import { docsAuth } from "@/lib/accounts-auth";

// Login, callback, logout (POST only, so link prefetching cannot sign anyone
// out) and logout-complete. `/api/auth/session` has its own route, which the
// setup app reads too.
async function handle(request: Request): Promise<Response> {
  const auth = docsAuth();
  if (!auth) {
    return Response.json(
      { error: "Sign-in is not configured on this deployment." },
      { status: 503 },
    );
  }
  return auth.GET(request);
}

export const GET = handle;
export const POST = handle;
