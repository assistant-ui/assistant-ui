import richFixtureModules from "virtual:rich-fixtures";
import type { Fixture, FixtureStep } from "./types";

export type { Fixture, FixtureInput, FixtureStep } from "./types";

export const BACKEND_TOOL_NAME = "search_workspace";
export const APPROVAL_TOOL_NAME = "request_approval";

export type ApprovalResult = { approved: boolean };

const LONG_MARKDOWN = `## Markdown fixture

This reply exercises the markdown renderer with **bold**, *italic*, \`inline code\` and a [link to assistant-ui](https://www.assistant-ui.com).

### A list

1. Tunnel \`fetch\` over \`postMessage\`
2. Map shadcn tokens to \`--vscode-*\` variables
   - nested bullet one
   - nested bullet two
3. Ship a template

### A code block

\`\`\`ts
export async function POST(req: Request): Promise<Response> {
  const { messages } = await req.json();
  return new Response(JSON.stringify({ count: messages.length }), {
    headers: { "content-type": "application/json" },
  });
}
\`\`\`

### A table

| Probe | Phase | Workstream |
| --- | --- | --- |
| bridge-roundtrip | 1 | Transport bridge |
| csp-zero | 2 | CSP and bundling |
| native-extras | 3 | VS Code-native extras |

> A block quote closes the fixture.`;

const APPROVAL_CALL_ID = "approval-1";

/** The core fixtures the probes and the welcome suggestions use. */
export const FIXTURES: readonly Fixture[] = [
  {
    name: "text",
    description: "Plain streaming text",
    prompt: "text Stream a short reply",
    script: () => [
      {
        type: "text",
        text: "This is the plain text fixture. Each word arrives as a separate chunk so you can watch the stream render in order, from the first word to the last.",
      },
    ],
  },
  {
    name: "markdown",
    description: "Long markdown with code, list, table and link",
    prompt: "markdown Render every markdown feature",
    script: () => [{ type: "text", text: LONG_MARKDOWN }],
  },
  {
    name: "tool",
    description: "Backend tool call with a result",
    prompt: "tool Search the workspace",
    script: () => [
      { type: "text", text: "Searching the workspace for route handlers." },
      {
        type: "tool-call",
        toolCallId: "search-1",
        toolName: BACKEND_TOOL_NAME,
        args: { query: "export async function POST" },
        result: {
          matches: [
            "src/fixtures/route.ts",
            "examples/with-ai-sdk-v7/app/api/chat/route.ts",
          ],
        },
      },
      { type: "text", text: "Found 2 route handlers." },
    ],
  },
  {
    name: "approval",
    description: "Frontend tool that waits for human approval",
    prompt: "approval Ask before deleting a file",
    script: ({ toolResults }) => {
      if (!toolResults.has(APPROVAL_CALL_ID)) {
        return [
          { type: "text", text: "I need your approval before continuing." },
          {
            type: "tool-call",
            toolCallId: APPROVAL_CALL_ID,
            toolName: APPROVAL_TOOL_NAME,
            args: { action: "Delete src/legacy.ts" },
          },
        ];
      }
      const { approved } = toolResults.get(APPROVAL_CALL_ID) as ApprovalResult;
      return [
        {
          type: "text",
          text: approved
            ? "Approved. Continuing the run: src/legacy.ts was deleted."
            : "Denied. Leaving src/legacy.ts in place.",
        },
      ];
    },
  },
  {
    name: "error",
    description: "Stream that fails partway through",
    prompt: "error Fail partway through",
    script: () => [
      { type: "text", text: "Starting a reply that will fail." },
      {
        type: "error",
        message: "Fixture error: the backend failed on purpose.",
      },
    ],
  },
];

/**
 * Rich fixtures, one file per component family in `src/fixtures/rich/`,
 * collected by the `virtual:rich-fixtures` build plugin.
 */
export const RICH_FIXTURES: readonly Fixture[] = richFixtureModules.flatMap(
  ({ value }) => value,
);

export const ALL_FIXTURES: readonly Fixture[] = [...FIXTURES, ...RICH_FIXTURES];

const HELP_FIXTURE: Fixture = {
  name: "help",
  description: "Lists the available fixtures",
  prompt: "help",
  script: () => [
    {
      type: "text",
      text: `Start a message with a fixture name:\n\n${ALL_FIXTURES.map((f) => `- **${f.name}**: ${f.description}`).join("\n")}`,
    },
  ],
};

export const selectFixture = (prompt: string): Fixture => {
  const name = prompt.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
  return ALL_FIXTURES.find((f) => f.name === name) ?? HELP_FIXTURE;
};

/** Fixture names defined more than once, or whose prompt selects another fixture. */
export const fixtureConflicts = () => {
  const seen = new Set<string>();
  const conflicts: string[] = [];
  for (const fixture of ALL_FIXTURES) {
    if (seen.has(fixture.name)) conflicts.push(`${fixture.name} is duplicated`);
    seen.add(fixture.name);
    if (selectFixture(fixture.prompt) !== fixture) {
      conflicts.push(`${fixture.name}'s prompt selects another fixture`);
    }
  }
  return conflicts;
};

export type FixtureEvent =
  | { type: "text-delta"; id: string; delta: string }
  | { type: "reasoning-delta"; id: string; delta: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      result: unknown;
      isError: boolean;
    }
  | Extract<FixtureStep, { type: "source" | "file" | "data" | "error" }>;

const sleep = (ms: number, signal: AbortSignal | undefined) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

export async function* playFixture(
  steps: readonly FixtureStep[],
  { delayMs = 20, signal }: { delayMs?: number; signal?: AbortSignal } = {},
): AsyncGenerator<FixtureEvent> {
  for (const [index, step] of steps.entries()) {
    switch (step.type) {
      case "text":
      case "reasoning": {
        const id = `${step.type}-${index}`;
        const type =
          step.type === "text" ? "text-delta" : ("reasoning-delta" as const);
        for (const [i, word] of step.text.split(" ").entries()) {
          await sleep(delayMs, signal);
          yield { type, id, delta: i === 0 ? word : ` ${word}` };
        }
        break;
      }
      case "tool-call":
        await sleep(delayMs * 10, signal);
        yield {
          type: "tool-call",
          toolCallId: step.toolCallId,
          toolName: step.toolName,
          args: step.args,
        };
        if (step.result !== undefined) {
          await sleep(delayMs * 20, signal);
          yield {
            type: "tool-result",
            toolCallId: step.toolCallId,
            result: step.result,
            isError: step.isError ?? false,
          };
        }
        break;
      case "error":
        await sleep(delayMs * 10, signal);
        yield step;
        return;
      default:
        await sleep(delayMs * 5, signal);
        yield step;
    }
  }
}
