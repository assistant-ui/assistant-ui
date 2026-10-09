import {
  AssistantRuntimeProvider,
  AuiConfig,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  Tools,
  useAui,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
} from "@assistant-ui/react";
import { useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { parsePartialJson } from "../src/agent";
import {
  createWidgetToolkit,
  useWidgetInstructions,
} from "../src/assistant-ui";
import { catalog, components, DASHBOARD_REPLY, DATA } from "./catalog";
import { RECORDED_STEPS } from "./recorded";
import { applyDemoTheme, demoState, sleep } from "./shared";

applyDemoTheme();

const FIXED_CODE = (() => {
  const show = RECORDED_STEPS[1]!.find((e) => e.type === "tool-call")!;
  const edit = RECORDED_STEPS[2]!.find((e) => e.type === "tool-call")!;
  const code = (show as { args: { widget_code: string } }).args.widget_code;
  const [fix] = (
    edit as { args: { edits: { old_string: string; new_string: string }[] } }
  ).args.edits;
  return code.replace(fix!.old_string, fix!.new_string);
})();

const SPEC_PATCHES = DASHBOARD_REPLY.split("\n")
  .filter((line) => line.startsWith("{"))
  .join("\n");

/** Streams a tool call's arguments the way a provider would. */
async function* streamToolCall(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
  prefix: ChatModelRunResult["content"],
  execute: ((args: unknown) => Promise<unknown>) | undefined,
): AsyncGenerator<ChatModelRunResult> {
  const text = JSON.stringify(args);
  const content = (
    argsText: string,
    result?: unknown,
  ): ChatModelRunResult["content"] => [
    ...(prefix ?? []),
    {
      type: "tool-call",
      toolCallId,
      toolName,
      argsText,
      args: (parsePartialJson(argsText) ?? {}) as never,
      ...(result !== undefined ? { result } : {}),
    },
  ];
  for (let i = 32; i < text.length; i += 32) {
    yield { content: content(text.slice(0, i)) };
    await sleep(20);
  }
  yield { content: content(text) };
  // LocalRuntime adapters run frontend tools themselves; ending on resolved
  // tool calls makes the runtime call the adapter again for the next step.
  const result = (await execute?.(args)) ?? { ok: true };
  yield {
    content: content(text, result),
    status: { type: "requires-action", reason: "tool-calls" },
  };
}

/** A fake model: the first question gets a widget, a follow-up gets a spec, tool results get one line. */
const adapter: ChatModelAdapter = {
  async *run({ messages, context, unstable_getMessage }) {
    const execute = (name: string) => {
      const tool = context.tools?.[name] as
        | { execute?: (args: unknown, ctx: unknown) => Promise<unknown> }
        | undefined;
      return tool?.execute
        ? (args: unknown) => tool.execute!(args, {})
        : undefined;
    };
    const current = unstable_getMessage?.();
    if (
      current?.content.some(
        (part) => part.type === "tool-call" && part.result !== undefined,
      )
    ) {
      yield {
        content: [
          {
            type: "text",
            text: "Done. Ask a follow-up from the widget or the composer.",
          },
        ],
      };
      return;
    }
    const userTurns = messages.filter((m) => m.role === "user").length;
    const intro = [
      {
        type: "text" as const,
        text:
          userTurns === 1
            ? "Here are signups by plan."
            : "Here is a dashboard to dig in.",
      },
    ];
    if (userTurns === 1) {
      yield* streamToolCall(
        "call_widget",
        "show_widget",
        {
          title: "signups_by_plan",
          loading_messages: ["Counting signups"],
          widget_code: FIXED_CODE,
        },
        intro,
        execute("show_widget"),
      );
    } else {
      yield* streamToolCall(
        "call_spec",
        "render_spec",
        { title: "sales_overview", patches: SPEC_PATCHES },
        intro,
        execute("render_spec"),
      );
    }
  },
};

function UserMessage() {
  return (
    <MessagePrimitive.Root className="user">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="assistant">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function Auto() {
  const aui = useAui();
  const messages = useAuiState((s) => s.thread.messages);
  const running = useAuiState((s) => s.thread.isRunning);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    aui.thread.append("Chart signups by plan for the last 30 days");
  }, [aui]);
  useEffect(() => {
    const users = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.map((p) => ("text" in p ? p.text : "")).join(""));
    demoState.prompts = users.slice(1);
    demoState.log = messages.map(
      (m) =>
        `${m.role}: ${m.content
          .map((p) =>
            p.type === "tool-call"
              ? `${p.toolName}(${p.result === undefined ? "pending" : JSON.stringify(p.result)})`
              : p.type,
          )
          .join(", ")}`,
    );
    if (!running && messages.length >= 2) {
      demoState.steps.push(`idle after ${messages.length} messages`);
      if (demoState.auto) setTimeout(() => (demoState.done = true), 1200);
    }
  }, [messages, running]);
  return null;
}

function Instructions({
  widgets,
}: {
  widgets: ReturnType<typeof createWidgetToolkit>;
}) {
  useWidgetInstructions(widgets.tools);
  return null;
}

function App() {
  const runtime = useLocalRuntime(adapter, { maxSteps: 3 });
  const widgets = useMemo(
    () =>
      createWidgetToolkit({
        catalog,
        components,
        widget: { product: "generative-frame-demo", maxHeight: 700 },
        handlers: {
          refresh: ({ range }, { state }) => {
            const data = DATA[String(range)] ?? DATA["7d"]!;
            state.set("/metrics", {
              revenue: data.revenue,
              delta: data.delta,
              orders: data.orders,
            });
            state.set("/regions", data.regions);
          },
        },
      }),
    [],
  );
  const config = useMemo(
    () => AuiConfig({ tools: Tools({ toolkit: widgets.toolkit }) }),
    [widgets],
  );
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Instructions widgets={widgets} />
      <Auto />
      <main>
        <h1>assistant-ui thread</h1>
        <p className="lead">
          createWidgetToolkit renders show_widget and render_spec calls as their
          arguments stream.
        </p>
        <ThreadPrimitive.Root>
          <ThreadPrimitive.Viewport className="thread">
            <ThreadPrimitive.Messages
              components={{ UserMessage, AssistantMessage }}
            />
          </ThreadPrimitive.Viewport>
          <ComposerPrimitive.Root className="composer">
            <ComposerPrimitive.Input
              placeholder="Ask something"
              rows={1}
              aria-label="Message"
            />
            <ComposerPrimitive.Send className="primary">
              Send
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </main>
    </AssistantRuntimeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
