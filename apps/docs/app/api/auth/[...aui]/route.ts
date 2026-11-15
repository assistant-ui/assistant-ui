import { docsAuth } from "@/lib/accounts-auth";

/**
 * Whether a POST came from a page on this site. Browsers send Sec-Fetch-Site
 * and Origin on form posts, so another site's form cannot sign a visitor out.
 */
function isSameOriginPost(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  // Every current browser sends Origin on a POST, so a POST with neither
  // header is refused rather than assumed to be from this site.
  if (origin === null) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

// Login, callback, logout (POST only, so link prefetching cannot sign anyone
// out) and logout-complete. `/api/auth/session` has its own route, which the
// setup app reads too.
async function handle(request: Request): Promise<Response> {
  if (request.method === "POST" && !isSameOriginPost(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }
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
