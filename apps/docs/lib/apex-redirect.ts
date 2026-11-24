// The site lives on www.assistant-ui.com. The bare domain redirects there, except
// under /apps/, which serves documents that must answer on the bare domain
// itself (did:web:assistant-ui.com:apps:* identities, which allow no redirect).
const APEX_HOST = "assistant-ui\\.com";
const CANONICAL_ORIGIN = "https://www.assistant-ui.com";

export const APEX_REDIRECTS = [
  {
    source: "/",
    has: [{ type: "host" as const, value: APEX_HOST }],
    destination: `${CANONICAL_ORIGIN}/`,
    permanent: true,
  },
  {
    source: "/:path((?!apps(?:/|$)).+)",
    has: [{ type: "host" as const, value: APEX_HOST }],
    destination: `${CANONICAL_ORIGIN}/:path`,
    permanent: true,
  },
];

export const APPS_DOCUMENT_HEADERS = {
  source: "/apps/:path*",
  headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
};
