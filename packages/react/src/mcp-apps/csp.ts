import type { McpAppResourceCSP } from "./types";

const isAllowedOrigin = (value: string, allowWebSocket: boolean): boolean => {
  const scheme = allowWebSocket ? /^(?:https?|wss?):\/\//i : /^https?:\/\//i;
  if (!scheme.test(value) || /[\s;'"`,]/.test(value)) {
    return false;
  }

  try {
    const url = new URL(value.replace("://*.", "://wildcard."));
    return (
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
};

const getAllowedOrigins = (
  values: unknown,
  allowWebSocket = false,
): string[] =>
  Array.isArray(values)
    ? [
        ...new Set(
          values.filter(
            (value): value is string =>
              typeof value === "string" &&
              isAllowedOrigin(value, allowWebSocket),
          ),
        ),
      ]
    : [];

const directive = (name: string, values: readonly string[]) =>
  `${name} ${values.join(" ")}`;

export const buildMcpAppCsp = (csp?: McpAppResourceCSP): string => {
  const connectDomains = getAllowedOrigins(csp?.connectDomains, true);
  const resourceDomains = getAllowedOrigins(csp?.resourceDomains);
  const frameDomains = getAllowedOrigins(csp?.frameDomains);
  const baseUriDomains = getAllowedOrigins(csp?.baseUriDomains);

  return [
    "default-src 'none'",
    directive("script-src", ["'self'", "'unsafe-inline'", ...resourceDomains]),
    directive("style-src", ["'self'", "'unsafe-inline'", ...resourceDomains]),
    directive(
      "connect-src",
      connectDomains.length > 0 ? ["'self'", ...connectDomains] : ["'none'"],
    ),
    directive("img-src", ["'self'", "data:", ...resourceDomains]),
    directive("font-src", ["'self'", ...resourceDomains]),
    directive("media-src", ["'self'", "data:", ...resourceDomains]),
    directive("frame-src", frameDomains.length > 0 ? frameDomains : ["'none'"]),
    directive(
      "base-uri",
      baseUriDomains.length > 0 ? baseUriDomains : ["'self'"],
    ),
    "object-src 'none'",
    "form-action 'none'",
  ].join("; ");
};

const findDoctypeEnd = (html: string): number => {
  let offset = html.charCodeAt(0) === 0xfeff ? 1 : 0;

  while (offset < html.length) {
    const whitespace = html.slice(offset).match(/^\s+/)?.[0];
    if (whitespace) {
      offset += whitespace.length;
      continue;
    }
    if (!html.startsWith("<!--", offset)) break;
    if (html.startsWith("<!-->", offset)) {
      offset += 5;
      continue;
    }
    if (html.startsWith("<!--->", offset)) {
      offset += 6;
      continue;
    }
    const commentEnd = html.indexOf("-->", offset + 4);
    const bangCommentEnd = html.indexOf("--!>", offset + 4);
    if (commentEnd === -1 && bangCommentEnd === -1) return 0;
    offset =
      bangCommentEnd !== -1 &&
      (commentEnd === -1 || bangCommentEnd < commentEnd)
        ? bangCommentEnd + 4
        : commentEnd + 3;
  }

  if (html.slice(offset, offset + 9).toLowerCase() !== "<!doctype") {
    return offset;
  }
  const end = html.indexOf(">", offset + 9);
  return end === -1 ? 0 : end + 1;
};

export const applyMcpAppCsp = (
  html: string,
  csp?: McpAppResourceCSP,
): string => {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildMcpAppCsp(csp)}">`;
  const insertionPoint = findDoctypeEnd(html);
  return `${html.slice(0, insertionPoint)}${meta}${html.slice(insertionPoint)}`;
};
