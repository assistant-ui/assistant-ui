import { createHmac } from "node:crypto";
import type { Instrumentation } from "next";
import { PostHog } from "posthog-node";
import { getAnonymousSessionSecret } from "./anonymous-session";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;

export const posthogServer = apiKey
  ? new PostHog(apiKey, { host: "https://us.i.posthog.com" })
  : null;

export function getDistinctId(req: Request): string {
  const cookie = req.headers.get("cookie");
  const posthogCookieMatch = cookie?.match(/ph_[^=]+=([^;]+)/);

  if (posthogCookieMatch) {
    try {
      const decoded = decodeURIComponent(posthogCookieMatch[1]!);
      const parsed = JSON.parse(decoded);
      if (parsed.distinct_id) return parsed.distinct_id;
    } catch {
      // ignore parse errors
    }
  }

  // A checked-in key would make this HMAC a reversible encoding of the address:
  // the IPv4 space is small enough to brute force once the key is public.
  const secret = getAnonymousSessionSecret();
  if (!secret) return "anon_unknown";

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) return "anon_unknown";

  return `anon_${createHmac("sha256", secret).update(ip).digest("base64url").slice(0, 24)}`;
}

// Server errors run without analytics consent, so they carry no visitor
// identity: not the posthog cookie (an account id once a visitor signs in) and
// not the address hash.
const SERVER_ERROR_DISTINCT_ID = "docs-server";

export async function captureRequestError(
  ...[error, request, context]: Parameters<Instrumentation.onRequestError>
) {
  if (!posthogServer) return;

  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;

  // The path keeps no query string, because search parameters can carry what
  // a visitor typed.
  await posthogServer.captureExceptionImmediate(
    error,
    SERVER_ERROR_DISTINCT_ID,
    {
      $process_person_profile: false,
      path: request.path.split("?")[0],
      method: request.method,
      router_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
      ...(context.renderSource ? { render_source: context.renderSource } : {}),
      ...(context.revalidateReason
        ? { revalidate_reason: context.revalidateReason }
        : {}),
      ...(digest ? { digest } : {}),
    },
  );
}
