import { createHmac } from "node:crypto";
import type { Instrumentation } from "next";
import { PostHog, type EventMessage } from "posthog-node";
import { getAnonymousSessionSecret } from "./anonymous-session";
import { consentRequiredFor } from "./consent-region";
import { getClientIp } from "./rate-limit";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;

// An error message can quote what a visitor sent (a JSON parse error quotes
// its input, a validation error the value it rejected), so only the error's
// type and stack frames leave the server.
const withoutExceptionMessages = (event: EventMessage): EventMessage => {
  if (event.event !== "$exception") return event;
  const list: unknown = event.properties?.$exception_list;
  if (!Array.isArray(list)) return event;
  return {
    ...event,
    properties: {
      ...event.properties,
      $exception_list: list.map((exception: { type?: unknown }) => ({
        ...exception,
        value: String(exception.type ?? "Error"),
      })),
    },
  };
};

export const posthogServer = apiKey
  ? new PostHog(apiKey, {
      host: "https://us.i.posthog.com",
      before_send: withoutExceptionMessages,
    })
  : null;

// AI conversation logs run without analytics consent, so they never carry the
// analytics cookie's id, which would tie them to the visitor's browsing and,
// once signed in, to their account.
export function getDistinctId(req: Request): string {
  // A checked-in key would make this HMAC a reversible encoding of the address:
  // the IPv4 space is small enough to brute force once the key is public.
  const secret = getAnonymousSessionSecret();
  if (!secret) return "anon_unknown";

  const ip = getClientIp(req);
  if (!ip) return "anon_unknown";

  return `anon_${createHmac("sha256", secret).update(ip).digest("base64url").slice(0, 24)}`;
}

// Server errors carry no visitor identity, not even the address hash.
const SERVER_ERROR_DISTINCT_ID = "docs-server";

const header = (
  headers: Parameters<Instrumentation.onRequestError>[1]["headers"],
  name: string,
) => {
  const value = headers[name];
  return (Array.isArray(value) ? value[0] : value) ?? null;
};

export async function captureRequestError(
  ...[error, request, context]: Parameters<Instrumentation.onRequestError>
) {
  if (!posthogServer) return;
  // The privacy policy's GPC and opt-in promises cover PostHog as a whole, and
  // a browser's stored consent never reaches the server, so a request that
  // sends GPC or comes from an opt-in region is not reported.
  if (header(request.headers, "sec-gpc") === "1") return;
  if (consentRequiredFor(header(request.headers, "x-vercel-ip-country")))
    return;

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
