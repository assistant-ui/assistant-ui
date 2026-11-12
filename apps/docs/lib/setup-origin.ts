const configured = process.env.NEXT_PUBLIC_SETUP_URL?.trim();

/** The origin of the setup app (apps/setup), which reads the visitor's session and Assistant Cloud projects from this site. */
export const SETUP_ORIGIN = new URL(
  configured ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3011"
      : "https://setup.assistant-ui.com"),
).origin;

/** True for a request the setup app sent from the visitor's browser: its origin, on the same site. */
export const isSetupAppRequest = (request: Request) => {
  if (request.headers.get("origin") !== SETUP_ORIGIN) return false;
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-site" || site === "same-origin";
};

/** The CORS headers that let the setup app read a response with the visitor's cookies; none for any other caller. */
export const setupCorsHeaders = (request: Request): Record<string, string> =>
  isSetupAppRequest(request)
    ? {
        "Access-Control-Allow-Origin": SETUP_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
