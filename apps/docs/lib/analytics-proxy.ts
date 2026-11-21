/**
 * Analytics requests go to their hosts from app/middleware.ts rather than
 * through config rewrites, so the visitor's cookies and the anonymous session
 * header stay on this site. Only the Umami tracker script and its send endpoint
 * are served; the rest of the Umami app is not.
 */
const UMAMI_ORIGIN = "https://assistant-ui-umami.vercel.app";
const UMAMI_PATHS = new Set(["/umami/script.js", "/umami/api/send"]);
const POSTHOG_ASSETS_ORIGIN = "https://us-assets.i.posthog.com";
const POSTHOG_ORIGIN = "https://us.i.posthog.com";
// The only request headers the analytics hosts receive. Everything else,
// including cookies, authorization, referer and the anonymous session header,
// stays on this site. `accept-encoding` is left to fetch, which decodes only
// the encodings it asks for.
const FORWARDED_ANALYTICS_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "user-agent",
  "x-forwarded-for",
  "x-real-ip",
];

// Assigning the path keeps the host fixed; resolving the path as a relative
// URL would let a `//host` path name another host.
function onHost(origin: string, pathname: string, search: string): URL {
  const destination = new URL(origin);
  destination.pathname = pathname || "/";
  destination.search = search;
  return destination;
}

/** Where an analytics path goes; null for a refused one, undefined for any other path. */
export function analyticsDestination(url: URL): URL | null | undefined {
  const { pathname, search } = url;
  if (pathname === "/umami" || pathname.startsWith("/umami/")) {
    if (!UMAMI_PATHS.has(pathname)) return null;
    return onHost(UMAMI_ORIGIN, pathname.slice("/umami".length), search);
  }
  if (pathname.startsWith("/ph/static/")) {
    return onHost(POSTHOG_ASSETS_ORIGIN, pathname.slice("/ph".length), search);
  }
  if (pathname === "/ph" || pathname.startsWith("/ph/")) {
    return onHost(POSTHOG_ORIGIN, pathname.slice("/ph".length), search);
  }
  return undefined;
}

async function proxyAnalytics(
  request: Request,
  destination: URL,
): Promise<Response> {
  const headers = new Headers();
  for (const name of FORWARDED_ANALYTICS_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    ...(hasBody ? { body: request.body, duplex: "half" } : {}),
  };
  let upstream: Response;
  try {
    upstream = await fetch(destination, init);
  } catch {
    return new Response(null, { status: 502 });
  }
  // fetch decodes the body, so its encoding headers no longer describe it.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/** Answers an analytics request; undefined for any other path. */
export function answerAnalytics(
  request: Request,
): Response | Promise<Response> | undefined {
  const url = new URL(request.url);
  const destination = analyticsDestination(url);
  if (destination === undefined) return undefined;
  if (destination === null) return new Response(null, { status: 404 });
  // Only a POST sends an event; a GET or HEAD of the send endpoint is answered
  // here, empty.
  if (
    url.pathname === "/umami/api/send" &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return new Response(null, { status: 204 });
  }
  return proxyAnalytics(request, destination);
}
