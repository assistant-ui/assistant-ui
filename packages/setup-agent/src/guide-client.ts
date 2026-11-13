import {
  CLI_CAPABILITIES,
  GUIDE_PROTOCOL,
  GuideError,
  buildGuide,
  sanitizeForTerminal,
  guideQuery,
  parseGuide,
} from "./guide";
import type { Guide, GuideContext, GuideRequest } from "./guide";

/** How long a command waits for the guide before it uses the bundled copy. */
const GUIDE_TIMEOUT_MS = 2_500;
/** A guide is a few dozen kilobytes; anything far larger is refused unread. */
const MAX_GUIDE_BYTES = 256 * 1024;

export type LoadedGuide = {
  guide: Guide;
  source: "server" | "bundled";
  /** Why the bundled copy is in use, when it is. */
  reason?: "offline" | "disabled" | "unavailable" | "outdated" | "rejected";
  /** What was wrong with the server's guide, for a rejected one. */
  detail?: string;
};

export type LoadGuideOptions = {
  fetch?: typeof globalThis.fetch;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

const readCapped = async (response: Response, max: number) => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      reader.cancel().catch(() => {});
      throw new GuideError("the guide is too large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
};

/**
 * The guide for this command, from `<setupUrl>/guide`, or the copy bundled
 * with this package when the server is unreachable, does not serve one,
 * no longer serves this protocol, or sends one `parseGuide` refuses.
 * `SETUP_AGENT_GUIDE=bundled` skips the server.
 *
 * `setupUrl` is the URL `parseSetupUrl` accepted: https, or http on this
 * machine. Redirects are refused, so the guide only ever comes from it.
 */
export const loadGuide = async (
  setupUrl: string,
  context: GuideContext,
  {
    fetch = globalThis.fetch,
    env = process.env,
    timeoutMs = GUIDE_TIMEOUT_MS,
  }: LoadGuideOptions = {},
): Promise<LoadedGuide> => {
  const request: GuideRequest = {
    protocol: GUIDE_PROTOCOL,
    capabilities: CLI_CAPABILITIES,
    context,
  };
  const bundled = buildGuide(request);
  if (env.SETUP_AGENT_GUIDE === "bundled")
    return { guide: bundled, source: "bundled", reason: "disabled" };
  let response: Response;
  try {
    response = await fetch(
      `${setupUrl.replace(/\/$/, "")}/guide?${guideQuery(request)}`,
      {
        headers: { accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch {
    return { guide: bundled, source: "bundled", reason: "offline" };
  }
  if (response.status === 426)
    return { guide: bundled, source: "bundled", reason: "outdated" };
  if (!response.ok)
    return { guide: bundled, source: "bundled", reason: "unavailable" };
  try {
    const body: unknown = JSON.parse(
      await readCapped(response, MAX_GUIDE_BYTES),
    );
    return { guide: parseGuide(body, request, bundled), source: "server" };
  } catch (error) {
    return {
      guide: bundled,
      source: "bundled",
      reason: error instanceof GuideError ? "rejected" : "unavailable",
      ...(error instanceof GuideError && {
        detail: sanitizeForTerminal(error.message),
      }),
    };
  }
};

/**
 * One line for stderr when the bundled copy stands in for a reason the user
 * should hear about, else undefined. Written here, not by the server.
 */
export const guideWarning = (loaded: LoadedGuide) =>
  loaded.reason === "outdated"
    ? "setup-agent: the setup server no longer serves this version's protocol; using the instructions bundled with it. Run the latest setup-agent for current instructions.\n"
    : loaded.reason === "rejected"
      ? `setup-agent: refused the setup server's guide (${loaded.detail}); using the instructions bundled with this version.\n`
      : undefined;
