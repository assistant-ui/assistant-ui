/**
 * The guide: every text the CLI shows the coding agent and the order of its
 * intro, fetched from the setup server at `<setup-url>/guide` so a wording
 * or flow fix ships with a server deploy. Setup is online-only, and the CLI
 * keeps no copy of the text.
 *
 * The guide is data. The CLI prints its texts after stripping control
 * characters, fills `{{name}}` placeholders with values it computes itself,
 * and runs intro steps only from `LOCAL_ACTIONS`. Commands it runs, files it
 * writes and URLs it opens never come from the guide.
 */

/** The guide format the CLI reads. Bump it only for a change an older CLI cannot read. */
export const GUIDE_PROTOCOL = 1;

/** Every text the CLI prints from the guide. */
export const GUIDE_TEXT_KEYS = [
  "briefing",
  "intro.status-heading",
  "stream.briefing",
  "stream.briefing-footer",
  "stream.stay-connected",
  "stream.opened.input",
  "stream.opened.plan",
  "stream.opened.finish",
  "stream.ask.recently-opened",
  "stream.ask.browser-closed",
  "stream.ask.no-browser",
  "wait.waiting",
  "done.next",
  "need.plan.question",
  "need.plan.approve",
  "need.plan.revise",
  "need.plan.format",
  "need.finish.question",
  "need.finish.question-preview",
  "need.finish.close",
  "need.finish.format",
  "need.input.empty-prompt",
  "need.input.optional",
  "need.input.model",
  "need.product.add",
  "need.product.decline",
  "need.format.text",
  "need.format.product",
  "need.format.model",
  "need.format.entry-point",
  "need.format.choice",
  "need.format.multiple",
] as const;
export type GuideTextKey = (typeof GUIDE_TEXT_KEYS)[number];

/** All a guide can make the CLI do: print one of its texts, print the setup's state, or announce the agent. */
const LOCAL_ACTIONS = ["print", "print-status", "announce-agent"] as const;

export type GuideStep =
  | { action: "print"; text: GuideTextKey }
  | { action: "print-status" }
  | { action: "announce-agent" };

export type Guide = {
  protocol: typeof GUIDE_PROTOCOL;
  texts: Record<GuideTextKey, string>;
  intro: GuideStep[];
};

/** Who started the setup (the user's browser, `assistant-ui setup`, or that command as the stream) and whether a browser opens. */
export type GuideContext = {
  started: "user" | "agent" | "agent-stream";
  opened: boolean;
};

const MAX_GUIDE_BYTES = 256 * 1024;
const TIMEOUT_MS = 5_000;

/**
 * `text` without control characters other than tab and line feed (an escape
 * sequence could rewrite the terminal) and bidirectional overrides.
 */
const sanitizeTerminalText = (text: string) =>
  // oxlint-disable-next-line no-control-regex
  text.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, "");

/** A guide text with its placeholders filled once; a value is never read for placeholders itself. */
export const renderText = (
  guide: Pick<Guide, "texts">,
  key: GuideTextKey,
  values: Record<string, string | number> = {},
) =>
  guide.texts[key].replace(/\{\{([A-Za-z]+)\}\}/g, (_, name: string) =>
    String(values[name] ?? ""),
  );

const isTextKey = (value: unknown): value is GuideTextKey =>
  (GUIDE_TEXT_KEYS as readonly unknown[]).includes(value);

/** The guide the server sent, or an error saying what this CLI cannot use. */
export const parseGuide = (value: unknown): Guide => {
  const guide = value as Partial<Record<keyof Guide, unknown>> | null;
  if (guide?.protocol !== GUIDE_PROTOCOL)
    throw new Error(`the guide is not protocol ${GUIDE_PROTOCOL}`);
  const texts = guide.texts as Record<string, unknown> | undefined;
  const parsed = {} as Record<GuideTextKey, string>;
  for (const key of GUIDE_TEXT_KEYS) {
    const text = texts?.[key];
    if (typeof text !== "string") throw new Error(`the guide has no "${key}"`);
    parsed[key] = sanitizeTerminalText(text);
  }
  if (!Array.isArray(guide.intro)) throw new Error("the guide has no intro");
  const intro = guide.intro.map((step: unknown): GuideStep => {
    const { action, text, ...rest } = (step ?? {}) as Record<string, unknown>;
    const allowed =
      (LOCAL_ACTIONS as readonly unknown[]).includes(action) &&
      Object.keys(rest).length === 0 &&
      (action === "print" ? isTextKey(text) : text === undefined);
    if (!allowed)
      throw new Error(
        `the guide asks for an action this CLI does not run: ${sanitizeTerminalText(JSON.stringify(step) ?? "").slice(0, 80)}`,
      );
    return action === "print"
      ? { action, text: text as GuideTextKey }
      : { action: action as "print-status" | "announce-agent" };
  });
  return { protocol: GUIDE_PROTOCOL, texts: parsed, intro };
};

/**
 * The guide for this setup, from `<setupUrl>/guide`. Setup is online-only:
 * without the guide the command fails. Redirects are refused, so the guide
 * only ever comes from the setup URL `parseSetupUrl` accepted.
 */
export const loadGuide = async (
  setupUrl: string,
  { started, opened }: GuideContext,
): Promise<Guide> => {
  const query = new URLSearchParams({
    protocol: String(GUIDE_PROTOCOL),
    started,
    opened: opened ? "1" : "0",
  });
  const offline = `Setup needs internet access to ${setupUrl}`;
  let response: Response;
  try {
    response = await fetch(`${setupUrl.replace(/\/$/, "")}/guide?${query}`, {
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error(offline);
  }
  if (response.status === 426) {
    const { supported = [] } = (await response.json().catch(() => ({}))) as {
      supported?: unknown[];
    };
    throw new Error(
      supported.some((v) => typeof v === "number" && v > GUIDE_PROTOCOL)
        ? "this setup-agent is older than the setup server supports; run the latest setup-agent"
        : "this setup-agent is newer than the setup server; try again once the server updates",
    );
  }
  if (!response.ok) throw new Error(`${offline} (HTTP ${response.status})`);
  try {
    let body = "";
    const decoder = new TextDecoder();
    for await (const chunk of response.body ?? []) {
      body += decoder.decode(chunk, { stream: true });
      if (body.length > MAX_GUIDE_BYTES) throw new Error("it is too large");
    }
    return parseGuide(JSON.parse(body));
  } catch (error) {
    throw new Error(
      `the setup server sent a guide this setup-agent cannot use (${error instanceof Error ? error.message : String(error)})`,
    );
  }
};
