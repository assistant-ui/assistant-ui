"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiProvider,
  InMemoryThreadListAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
} from "@assistant-ui/react";

/**
 * A scripted runtime, so a block can be tried without a backend: each reply streams in, and the script it plays depends on what was
 * asked. Weather asks call a tool, code asks answer with a code block, compare
 * asks answer with a table, and anything else thinks first and then answers.
 */

type Content = NonNullable<ChatModelRunResult["content"]>;
type Part = Content[number];

type Step =
  | { kind: "reasoning"; text: string }
  | { kind: "text"; text: string }
  | {
      kind: "tool";
      name: string;
      args: Record<string, unknown>;
      result: unknown;
    };

const WORD_DELAY = 28;
const TOOL_DELAY = 900;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolve();
    });
  });

/** Splits text into chunks that end in whitespace, so words arrive whole. */
const chunks = (text: string) => text.match(/\S+\s*|\s+/g) ?? [];

async function* play(
  steps: readonly Step[],
  signal: AbortSignal,
): AsyncGenerator<ChatModelRunResult> {
  const done: Part[] = [];
  for (const step of steps) {
    if (step.kind === "tool") {
      const call = {
        type: "tool-call" as const,
        toolCallId: `call_${crypto.randomUUID()}`,
        toolName: step.name,
        args: step.args,
        argsText: JSON.stringify(step.args),
      } as Part;
      yield { content: [...done, call] };
      await sleep(TOOL_DELAY, signal);
      if (signal.aborted) return;
      const finished = { ...call, result: step.result } as Part;
      done.push(finished);
      yield { content: [...done] };
      continue;
    }
    let text = "";
    for (const chunk of chunks(step.text)) {
      text += chunk;
      yield { content: [...done, { type: step.kind, text } as Part] };
      await sleep(WORD_DELAY, signal);
      if (signal.aborted) return;
    }
    done.push({ type: step.kind, text } as Part);
  }
}

const city = (prompt: string) =>
  /\bin ([A-Z][\w]*(?: [A-Z][\w]*)*)/.exec(prompt)?.[1] ?? "San Francisco";

function script(prompt: string): Step[] {
  const asked = prompt.toLowerCase();

  if (asked.includes("weather")) {
    const location = city(prompt);
    return [
      {
        kind: "reasoning",
        text: `The user wants current conditions for ${location}. I'll look them up with the weather tool.`,
      },
      {
        kind: "tool",
        name: "get_weather",
        args: { location },
        result: { temperature: 68, condition: "Partly cloudy", humidity: 54 },
      },
      {
        kind: "text",
        text: `It's **68°F and partly cloudy** in ${location} right now, with 54% humidity. A light jacket should do.`,
      },
    ];
  }

  if (/\b(code|function|hook|typescript|debounce)\b/.test(asked)) {
    return [
      {
        kind: "text",
        text: [
          "Here's a small, typed `debounce` you can drop into a project:",
          "",
          "```ts",
          "export function debounce<A extends unknown[]>(",
          "  fn: (...args: A) => void,",
          "  wait = 200,",
          ") {",
          "  let timer: ReturnType<typeof setTimeout> | undefined;",
          "  return (...args: A) => {",
          "    clearTimeout(timer);",
          "    timer = setTimeout(() => fn(...args), wait);",
          "  };",
          "}",
          "```",
          "",
          "Each call resets the timer, so `fn` runs once the calls stop for `wait` milliseconds.",
        ].join("\n"),
      },
    ];
  }

  if (/\b(compare|vs|versus|table)\b/.test(asked)) {
    return [
      {
        kind: "reasoning",
        text: "A side-by-side table reads best for a comparison like this.",
      },
      {
        kind: "text",
        text: [
          "Here's how they line up:",
          "",
          "| | React | Vue | Svelte |",
          "| --- | --- | --- | --- |",
          "| Rendering | Virtual DOM | Virtual DOM | Compiled |",
          "| Reactivity | Hooks | Proxies | Runes |",
          "| Learning curve | Medium | Gentle | Gentle |",
          "",
          "All three are solid; the choice usually comes down to your team.",
        ].join("\n"),
      },
    ];
  }

  return [
    {
      kind: "reasoning",
      text: "Let me think about what would be most useful here, and keep the answer short.",
    },
    {
      kind: "text",
      text: [
        `You asked: *${prompt.trim() || "something"}*.`,
        "",
        "This demo plays scripted replies, so nothing leaves your browser. Try asking for:",
        "",
        "- the **weather** somewhere, to see a tool call",
        "- some **code**, to see a code block",
        "- a **comparison**, to see a table",
      ].join("\n"),
    },
  ];
}

const lastUserText = (
  messages: Parameters<ChatModelAdapter["run"]>[0]["messages"],
) => {
  const message = messages.findLast((item) => item.role === "user");
  return (message?.content ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ");
};

const scriptedAdapter: ChatModelAdapter = {
  run({ messages, abortSignal }) {
    return play(script(lastUserText(messages)), abortSignal);
  },
};

const EMPTY_CONFIG = AuiConfig({});

/**
 * Wraps a block in the scripted runtime, with conversations kept in memory.
 * It starts from an empty scope, so it works inside a page that has an
 * assistant of its own.
 */
export function DemoRuntimeProvider({ children }: { children: ReactNode }) {
  return (
    <AuiProvider extends={null} config={EMPTY_CONFIG}>
      <DemoRuntime>{children}</DemoRuntime>
    </AuiProvider>
  );
}

function DemoRuntime({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => new InMemoryThreadListAdapter(), []);
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function DemoThreadRuntime() {
      return useLocalRuntime(scriptedAdapter);
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
