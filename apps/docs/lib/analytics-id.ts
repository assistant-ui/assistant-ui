import { createHmac } from "node:crypto";
import { getAnonymousSessionSecret } from "./anonymous-session";

/**
 * The PostHog distinct id for a signed-in account. It is stable per account but
 * cannot be linked back to the account without the deployment's secret, which
 * keeps the docs site's PostHog identifier pseudonymous.
 */
export function analyticsIdFor(accountId: string): string | null {
  const secret = getAnonymousSessionSecret();
  if (!secret) return null;
  const digest = createHmac("sha256", secret)
    .update(`posthog-user:${accountId}`)
    .digest("base64url");
  return `u_${digest.slice(0, 32)}`;
}
