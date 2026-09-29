import { createHmac } from "node:crypto";
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
