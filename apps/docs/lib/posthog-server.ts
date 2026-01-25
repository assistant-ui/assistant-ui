import { PostHog } from "posthog-node";

export const posthogServer = new PostHog(
  process.env["NEXT_PUBLIC_POSTHOG_API_KEY"]!,
  {
    host: "https://us.i.posthog.com",
  },
);

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

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  return `anon_${ip}`;
}
