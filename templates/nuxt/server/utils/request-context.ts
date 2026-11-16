import type { H3Event } from "h3";

// Refuses chat requests that a browser sends from another site, so a page the
// developer visits cannot spend this app's model key. This is not
// authentication: add your own before you deploy the app publicly.
export function isAllowedRequestContext(event: H3Event) {
  const fetchSite = getRequestHeader(event, "sec-fetch-site");
  if (fetchSite !== undefined) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = getRequestHeader(event, "origin");
  if (origin === undefined) return true;

  try {
    return new URL(origin).origin === getRequestURL(event).origin;
  } catch {
    return false;
  }
}
