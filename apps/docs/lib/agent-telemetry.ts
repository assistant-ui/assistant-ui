import { after } from "next/server";
import { consentRequiredFor } from "./consent-region";

// Agent reads never run the browser analytics, so the server counts them.
// Every event shares one distinct id, builds no person profile and skips the
// GeoIP lookup, so no visitor identity, address or location reaches PostHog.
const AGENT_DISTINCT_ID = "docs-agent";

// Ordered: the first family whose pattern matches the user-agent wins, so a
// specific client comes before the runtime it is built on.
const CLIENT_FAMILIES: ReadonlyArray<readonly [string, RegExp]> = [
  ["internal", /^assistant-ui/i],
  // Before the products, whose crawlers (ClaudeBot, GPTBot) share their names.
  ["crawler", /[a-z]bot\b|crawl|spider|slurp/i],
  ["claude-code", /claude-code|claude-cli/i],
  ["claude", /claude|anthropic/i],
  ["codex", /codex/i],
  ["cursor", /cursor/i],
  ["copilot", /copilot|vscode-agent/i],
  ["opencode", /opencode/i],
  ["windsurf", /windsurf|codeium/i],
  ["cline", /cline|roo-?code|kilo-?code/i],
  ["gemini", /gemini/i],
  ["chatgpt", /chatgpt|openai/i],
  ["perplexity", /perplexity/i],
  ["grok", /grok/i],
  ["zed", /\bzed\b/i],
  ["devin", /devin/i],
  ["node", /^node$|node-fetch|undici|^bun\/|^deno\//i],
  ["python", /python|httpx|aiohttp/i],
  ["curl", /^curl\/|^wget\//i],
  ["go", /^go-http-client/i],
];

/** The agent or tool behind a request, from its user-agent; never the raw string. */
export function agentClientFamily(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  for (const [family, pattern] of CLIENT_FAMILIES) {
    if (pattern.test(userAgent)) return family;
  }
  if (userAgent.startsWith("Mozilla/")) return "browser";
  return "other";
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const IPV6 =
  /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b|\b(?:[0-9a-f]{1,4}:){1,6}:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4}\b/gi;
// API keys, tokens and other long opaque strings that mix letters and digits.
const TOKEN = /\b(?=[\w-]*\d)(?=[\w-]*[a-z])[\w-]{24,}\b/gi;

/**
 * Text an agent typed, such as a search query, cut to `max` characters with
 * emails, addresses and token-like strings replaced, so an identifier pasted
 * into a query never reaches analytics. The text is cut before the patterns
 * run, because they backtrack on a long input.
 */
export function agentText(value: string, max = 200): string {
  return value
    .trim()
    .slice(0, max * 2)
    .replace(EMAIL, "[email]")
    .replace(IPV4, "[ip]")
    .replace(IPV6, "[ip]")
    .replace(TOKEN, "[token]")
    .slice(0, max);
}

const MARKDOWN_ACCEPT = /text\/markdown/i;

export type AgentDocsRead = {
  kind: "llms" | "llms-full" | "skill" | "markdown";
  path: string;
  // The reader asked for markdown with an Accept header rather than a .md url.
  negotiated: boolean;
};

/**
 * Which agent read a request is, if any: llms.txt, llms-full.txt, a skill, a
 * page's markdown by its .md url, or any page fetched with
 * `Accept: text/markdown`. The proxy matches these paths (proxy.ts), because
 * the CDN answers most of them from cache without running a route.
 */
// A path keeps its percent-encoding, which would hide an encoded `@` or `:`
// from the scrub.
function decodedPath(pathname: string) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

export function agentDocsRead(
  pathname: string,
  headers: Headers,
): AgentDocsRead | null {
  const path = agentText(decodedPath(pathname));
  const negotiated = MARKDOWN_ACCEPT.test(headers.get("accept") ?? "");
  if (pathname === "/llms.txt")
    return { kind: "llms", path, negotiated: false };
  if (pathname === "/llms-full.txt") {
    return { kind: "llms-full", path, negotiated: false };
  }
  if (
    pathname === "/skill.md" ||
    pathname.startsWith("/.well-known/agent-skills/")
  ) {
    return { kind: "skill", path, negotiated: false };
  }
  if (/\.mdx?$/i.test(pathname)) {
    return { kind: "markdown", path, negotiated: false };
  }
  if (negotiated) {
    return { kind: pathname === "/" ? "llms" : "markdown", path, negotiated };
  }
  return null;
}

export type AgentEventProperties = Record<
  string,
  string | number | boolean | undefined
>;

/**
 * Sends one agent-read event after the response, so it adds no latency and a
 * PostHog outage never fails the read. Properties that need more work, such
 * as reading a response body, can come from a function, which runs then too.
 * Requests that send GPC or come from an opt-in region are not counted, the
 * same rule the server error reports follow (lib/posthog-server.ts).
 */
export function captureAgentEvent(
  headers: Headers,
  event: string,
  properties: AgentEventProperties | (() => Promise<AgentEventProperties>),
) {
  if (headers.get("sec-gpc") === "1") return;
  if (consentRequiredFor(headers.get("x-vercel-ip-country"))) return;

  // The PostHog client loads after the response, so the proxy, which runs in
  // front of every agent read, does not load it on a cold start.
  const send = async () => {
    try {
      const { posthogServer } = await import("./posthog-server");
      if (!posthogServer) return;
      const resolved =
        typeof properties === "function" ? await properties() : properties;
      await posthogServer.captureImmediate({
        distinctId: AGENT_DISTINCT_ID,
        event,
        properties: {
          ...Object.fromEntries(
            Object.entries(resolved).filter(([, value]) => value !== undefined),
          ),
          $process_person_profile: false,
          $geoip_disable: true,
        },
      });
    } catch {
      // Analytics never fail a read.
    }
  };

  after(send);
}
