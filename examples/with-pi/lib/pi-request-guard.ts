const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

const getRequestOrigin = (request: Request) => {
  const host = request.headers.get("host");
  if (host === null) return undefined;

  try {
    return new URL(`${new URL(request.url).protocol}//${host}`);
  } catch {
    return undefined;
  }
};

const isAllowedRequestContext = (request: Request, requestOrigin: URL) => {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");

  if (
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.method === "OPTIONS"
  ) {
    if (fetchSite !== null) {
      return fetchSite === "same-origin" || fetchSite === "none";
    }
    return origin === null || origin === requestOrigin.origin;
  }

  if (origin !== null && origin !== requestOrigin.origin) return false;
  if (fetchSite !== null && fetchSite !== "same-origin") return false;
  if (origin !== null || fetchSite !== null) return true;

  return (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() === "application/json"
  );
};

export function getPiRequestRejection(request: Request): Response | undefined {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const requestOrigin = getRequestOrigin(request);
  if (
    requestOrigin === undefined ||
    !LOOPBACK_HOSTNAMES.has(requestOrigin.hostname)
  ) {
    return new Response(null, { status: 403 });
  }

  if (!isAllowedRequestContext(request, requestOrigin)) {
    return new Response(null, { status: 403 });
  }

  return undefined;
}
