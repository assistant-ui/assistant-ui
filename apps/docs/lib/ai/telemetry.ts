import { OpenTelemetry } from "@ai-sdk/otel";
import type { TelemetryOptions } from "ai";
import { posthogServer } from "@/lib/posthog-server";

const integration = new OpenTelemetry({ runtimeContext: true });

type PosthogTelemetryOptions = {
  distinctId: string;
  spanName: string;
  source: string;
  properties?: Record<string, string>;
};

type PosthogRuntimeContext = Record<string, string>;

// PostHog's OTLP ingestion resolves the event identity from the
// posthog_distinct_id context key, promotes posthog_-prefixed keys to event
// properties with the prefix stripped, and lets $ai_span_name override the
// span name on every span of the call.
export function posthogTelemetry({
  distinctId,
  spanName,
  source,
  properties = {},
}: PosthogTelemetryOptions): {
  runtimeContext: PosthogRuntimeContext;
  telemetry: TelemetryOptions<PosthogRuntimeContext>;
} {
  const runtimeContext: PosthogRuntimeContext = {
    $ai_span_name: spanName,
    posthog_distinct_id: distinctId,
    posthog_source: source,
    ...Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        `posthog_${key}`,
        value,
      ]),
    ),
  };

  return {
    runtimeContext,
    telemetry: {
      functionId: spanName,
      includeRuntimeContext: Object.fromEntries(
        Object.keys(runtimeContext).map((key) => [key, true]),
      ),
      integrations: [integration],
    },
  };
}

/*
 * Docs assistant turns: what readers ask about and whether the docs answered
 * it, as a weekly dashboard. Only fixed labels and counts are logged. The
 * reader's text is read on the server to pick a label and is never logged,
 * and the event carries no visitor id, address or session.
 */

// Ordered from specific to general: on a tie the earlier topic wins.
const DOCS_TOPICS = [
  [
    "human_in_the_loop",
    /\b(approv\w*|interrupt\w*|human[- ]in[- ]the[- ]loop|hitl|confirm(ation)? (before|step))/,
  ],
  [
    "tool_ui",
    /\b(tool ?ui|generative ui|gen ?ui|render(ing)? (a |the )?tool|makeassistanttoolui|usetoolui|data ui|a2ui|tool call(s)? (ui|component))/,
  ],
  [
    "defining_tools",
    /\b(tools?|function call\w*|makeassistanttool|useassistanttool|frontend tool|backend tool|tool execution)\b/,
  ],
  [
    "thread_list",
    /\b(thread ?list|threadlist|sidebar|rename|archiv\w*|delete (a |the )?thread|new thread|multiple threads|remotethreadlist\w*|thread title)/,
  ],
  [
    "persistence",
    /\b(persist\w*|history|database|\bdb\b|save (the )?(messages|chat|thread)|load (the )?(messages|chat|thread)|threadhistoryadapter|localstorage|postgres|supabase|reload)/,
  ],
  [
    "thread_state",
    /\b(useaui\w*|useassistantstate|usethread\w*|thread\.append|append|isrunning|is running|cansend|metadata|runtime api|programmatic\w*)/,
  ],
  [
    "attachments",
    /\b(attach\w*|upload\w*|file input|images?|pdfs?|drag and drop)\b/,
  ],
  [
    "composer",
    /\b(composer|input box|text ?area|mention\w*|slash command\w*|send button|placeholder|draft)/,
  ],
  [
    "markdown_streaming",
    /\b(markdown|code ?blocks?|syntax highlight\w*|smooth\w*|typewriter|streamdown|mermaid|latex|katex|math)/,
  ],
  ["reasoning", /\b(reasoning|chain[- ]of[- ]thought|thinking)\b/],
  [
    "voice",
    /\b(voice|speech|dictation|text[- ]to[- ]speech|tts|audio|realtime)\b/,
  ],
  [
    "suggestions",
    /\b(suggestions?|welcome (screen|message)|follow[- ]ups?|starter prompts?)\b/,
  ],
  [
    "resumable",
    /\b(resum\w*|reconnect\w*|background run\w*|cancel\w*|abort\w*|stop (the )?(run|generation|stream))/,
  ],
  [
    "modal_sidebar",
    /\b(modal|floating|popover|copilot|widget|assistantmodal|chat bubble)/,
  ],
  [
    "styling",
    /\b(styl\w*|theme\w*|tailwind|classname\w*|css|dark mode|colou?rs?|font\w*|look and feel|customi[sz]\w* (the )?(ui|look|appearance))/,
  ],
  [
    "elements_catalog",
    /\b(elements?|components?|shadcn|registry|charts?|citations?|model selector|progress|timeline|artifact\w*)\b/,
  ],
  [
    "agent_frameworks",
    /\b(ag-?ui|langgraph|langchain|adk|opencode|a2a|mastra|acp|crewai|agno|pydantic ?ai|llamaindex|copilotkit)\b/,
  ],
  [
    "custom_protocol",
    /\b(assistant ?transport|data ?stream|forwardedprops|forwarded props|sse|server[- ]sent|protocol)\b/,
  ],
  [
    "external_store",
    /\b(externalstore\w*|external store|zustand|redux|jotai|own state)/,
  ],
  [
    "custom_backend",
    /\b(localruntime|uselocalruntime|chatmodeladapter|custom backend|own backend|my backend|my api|own api|fastapi|express|flask|django|backend)/,
  ],
  [
    "ai_sdk",
    /\b(ai[- ]sdk|vercel ai|usechatruntime|usechat|assistantchattransport|streamtext|route handler)/,
  ],
  [
    "platforms",
    /\b(vue|react native|expo|ink|terminal|cli app|svelte|angular|native app|mobile)\b/,
  ],
  ["agent_docs", /\b(llms\.txt|llms|mcp|skills?|cursor|claude code|codex)\b/],
  ["cloud", /\b(assistant ?cloud|cloud|pricing|plan|billing|api key)\b/],
  [
    "install_setup",
    /\b(install\w*|set ?up|setup|get(ting)? started|npx|create-assistant-ui|template|next\.?js|vite|quickstart|what is assistant-ui|runtime)\b/,
  ],
] as const satisfies readonly (readonly [string, RegExp])[];

export type DocsTopic =
  | (typeof DOCS_TOPICS)[number][0]
  | "greeting"
  | "off_topic_or_unclear";

export const DOCS_TOPIC_LABELS: readonly DocsTopic[] = [
  ...DOCS_TOPICS.map(([label]) => label),
  "greeting",
  "off_topic_or_unclear",
];

const GREETING =
  /^(hi|hey|hello|yo|hiya|howdy|hola|thanks|thank you|thx|good (morning|afternoon|evening))\b[\s!.,?]*\w{0,12}[\s!.?]*$/;

/**
 * A fixed topic label for a reader's question, chosen by keyword rules over
 * the question and the page it was asked from. Only the label leaves the
 * server; the text never does.
 */
export function classifyDocsTopic(
  question: string,
  pagePath?: string,
): DocsTopic {
  const text = question.toLowerCase().replace(/\s+/g, " ").trim();
  if (GREETING.test(text)) return "greeting";

  let best: DocsTopic = "off_topic_or_unclear";
  let bestScore = 0;
  for (const [label, pattern] of DOCS_TOPICS) {
    const global = new RegExp(pattern.source, "g");
    const score = text.match(global)?.length ?? 0;
    if (score > bestScore) {
      best = label;
      bestScore = score;
    }
  }
  if (bestScore > 0 || !pagePath) return best;

  // A short follow-up ("how?", "show me an example") takes the topic of the
  // page it was asked from.
  const page = pagePath.toLowerCase().replace(/[/_-]+/g, " ");
  for (const [label, pattern] of DOCS_TOPICS) {
    if (pattern.test(page)) return label;
  }
  return best;
}

export type DocsTurnOutcome =
  | "docs"
  | "source"
  | "no_lookup"
  | "step_cap"
  | "error"
  | "aborted";

type TurnStep = {
  toolResults: readonly { toolName: string; output?: unknown }[];
};

const SOURCE_TOOLS = new Set(["bash", "readFile"]);

const isFailedRead = (output: unknown) =>
  typeof output === "object" && output !== null && "error" in output;

/**
 * Where an assistant turn found its answer: in the docs pages only, in the
 * source, nowhere (answered from the prompt), or not at all because it used
 * every step, failed or was stopped.
 */
export function summarizeDocsTurn({
  steps,
  maxSteps,
  ended,
}: {
  steps: readonly TurnStep[];
  maxSteps: number;
  ended: "finished" | "error" | "aborted";
}) {
  let docsPagesRead = 0;
  let sourceCalls = 0;
  for (const step of steps) {
    for (const result of step.toolResults) {
      if (result.toolName === "readDoc" && !isFailedRead(result.output)) {
        docsPagesRead += 1;
      }
      if (SOURCE_TOOLS.has(result.toolName)) sourceCalls += 1;
    }
  }

  const outcome: DocsTurnOutcome =
    ended === "error"
      ? "error"
      : ended === "aborted"
        ? "aborted"
        : steps.length >= maxSteps
          ? "step_cap"
          : sourceCalls > 0
            ? "source"
            : docsPagesRead > 0
              ? "docs"
              : "no_lookup";

  return {
    outcome,
    steps: steps.length,
    docs_pages_read: docsPagesRead,
    source_calls: sourceCalls,
  };
}

export type DocsTurnEvent = ReturnType<typeof summarizeDocsTurn> & {
  topic: DocsTopic;
  model: string;
  input_tokens?: number | undefined;
  output_tokens?: number | undefined;
};

// One fixed id for every turn, so the event carries no visitor identity and
// creates no person profile.
const DOCS_TURN_DISTINCT_ID = "docs-assistant";

/** Sends one `docs_assistant_turn` event. Never throws. */
export async function captureDocsAssistantTurn(
  event: DocsTurnEvent,
  client: Pick<
    NonNullable<typeof posthogServer>,
    "captureImmediate"
  > | null = posthogServer,
): Promise<void> {
  if (!client) return;
  try {
    await client.captureImmediate({
      distinctId: DOCS_TURN_DISTINCT_ID,
      event: "docs_assistant_turn",
      disableGeoip: true,
      properties: {
        $process_person_profile: false,
        ...Object.fromEntries(
          Object.entries(event).filter(([, value]) => value !== undefined),
        ),
      },
    });
  } catch (error) {
    console.error(
      "[docs_assistant_turn]",
      error instanceof Error ? error.name : "Error",
    );
  }
}
