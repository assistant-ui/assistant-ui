import type { JsonSchema } from "../json-schema";
import { buildRepairFeedback, type RenderReport } from "../repair/repair";
import {
  createSpecStream,
  parseSpecStream,
  type SpecStream,
} from "../spec/stream";
import type { Spec } from "../spec/types";
import { applyWidgetEdits, type WidgetEdit } from "../tools/edits";
import {
  createWidgetTools,
  type EditWidgetInput,
  type ShowWidgetInput,
  type SpecTools,
  type ToolDefinition,
  type WidgetTools,
} from "../tools/tools";
import type { WidgetInspection } from "../widget";
import type {
  AgentMessage,
  AgentToolCall,
  AgentToolDeclaration,
  WidgetAgentModel,
} from "./model";
import { parsePartialJson } from "./partial-json";

export type WidgetMode = "html" | "spec";

/**
 * Where the agent streams the widget it generates. A `WidgetHandle` from
 * `createWidget` satisfies the HTML members; `spec` receives every spec
 * update. Every member is optional, so a sink can observe only what it needs.
 */
export type WidgetSink = {
  write?(chunk: string): void;
  end?(): Promise<unknown>;
  replace?(code: string): Promise<unknown>;
  /** Reports problems after rendering; used when no `preview` is configured. */
  inspect?(): Promise<
    Pick<WidgetInspection, "errors" | "console" | "blank" | "size">
  >;
  spec?(spec: Spec, info: { streaming: boolean }): void;
};

export type GenerateWidgetInput = {
  /** What the widget should show or do, in plain language. */
  brief: string;
  /** Data the widget should use, passed through as JSON. */
  data?: unknown;
  mode?: WidgetMode;
  title?: string;
};

export type GenerateWidgetResult = {
  ok: boolean;
  title: string;
  mode: WidgetMode;
  /** The sub-agent's one-sentence description of what it built. */
  summary: string;
  /** Problems left in the final render; empty when `ok`. */
  errors: string[];
  /** Final widget code (html mode). */
  code?: string;
  /** Final spec (spec mode). */
  spec?: Spec;
  /** Renders attempted, including the first. */
  rounds: number;
};

export type WidgetAgentEvent =
  | { type: "start"; title: string; mode: WidgetMode }
  | { type: "status"; text: string }
  | { type: "text-delta"; text: string }
  | { type: "code-delta"; title: string; delta: string; code: string }
  | { type: "code"; title: string; code: string }
  | { type: "spec"; title: string; spec: Spec; streaming: boolean }
  | {
      type: "feedback";
      title: string;
      ok: boolean;
      text: string;
      round: number;
    }
  | { type: "done"; result: GenerateWidgetResult };

export type CreateWidgetAgentOptions = {
  model: WidgetAgentModel;
  /**
   * The widget tools the sub-agent calls; pass `createWidgetTools({ catalog })`
   * to enable spec mode, and share them with the host to edit results later.
   */
  tools?: WidgetTools & Partial<SpecTools>;
  /** Extra tools the sub-agent may call, e.g. to look up data. */
  extraTools?: Record<string, ToolDefinition<never, unknown>>;
  /** Renders allowed per generation, including the first. Defaults to 3. */
  maxRounds?: number;
  /** Model calls allowed per generation. Defaults to 8. */
  maxSteps?: number;
  /** Checks rendered HTML; defaults to the sink's `inspect()`. */
  preview?: (code: string) => Promise<RenderReport>;
  /** Wait before `inspect()` so late script errors are caught. Defaults to 250 ms. */
  settleMs?: number;
  /** Extra instructions for the sub-agent. */
  instructions?: string;
  onEvent?: (event: WidgetAgentEvent) => void;
  /** Creates the sink for a generation started through the `generate_widget` tool. */
  createSink?: (info: {
    title: string;
    mode: WidgetMode;
  }) => WidgetSink | undefined;
};

export type GenerateOptions = {
  signal?: AbortSignal;
  sink?: WidgetSink;
  onEvent?: (event: WidgetAgentEvent) => void;
};

export type WidgetAgent = {
  /** The single tool to give the main agent. */
  tool: ToolDefinition<GenerateWidgetInput, GenerateWidgetResult>;
  generate(
    input: GenerateWidgetInput,
    options?: GenerateOptions,
  ): Promise<GenerateWidgetResult>;
};

const GENERATE_WIDGET_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    brief: {
      type: "string",
      description:
        "What the widget should show or let the user do, with the facts it needs. A widget specialist builds it from this alone, so be specific.",
    },
    data: {
      description:
        "Structured data the widget should use (rows, series, options).",
    },
    mode: {
      type: "string",
      enum: ["html", "spec"],
      description:
        "html: a freeform visual (chart, diagram, small app). spec: UI built from the app's own components. Defaults to html.",
    },
    title: {
      type: "string",
      description:
        "Short snake_case identifier for the widget, unique in this conversation.",
    },
  },
  required: ["brief"],
  additionalProperties: false,
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 40)
    .replace(/^_+|_+$/g, "") || "widget";

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (ms <= 0 || signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

const systemPrompt = (mode: WidgetMode, title: string, extra?: string) =>
  [
    "You are a widget specialist. Build exactly one widget for the brief you are given.",
    mode === "html"
      ? `1. Call read_me with the modules you need.\n2. Call show_widget once with title "${title}".\n3. If the result reports problems, fix them with edit_widget (exact replacements) on the same title, or call show_widget again when the fix is large.`
      : `1. Call read_me with the "spec" module.\n2. Call render_spec with title "${title}" and JSONL patches.\n3. If the result reports issues, fix them with render_spec patches on the same title.`,
    "4. When it renders cleanly, reply with one short sentence saying what the widget shows. Write no other prose.",
    ...(extra ? [extra] : []),
  ].join("\n\n");

const briefMessage = (input: GenerateWidgetInput) =>
  input.data === undefined
    ? input.brief
    : `${input.brief}\n\nData (JSON):\n${JSON.stringify(input.data, null, 2)}`;

type PendingCall = { name: string; argsText: string };

/**
 * Delegated generation: a sub-agent with its own model loop turns a brief
 * into a finished widget (read_me → show_widget or render_spec → check →
 * repair) while streaming it into a sink. The main agent sees only the
 * `generate_widget` tool and a short result, which keeps its context small
 * at the cost of extra model calls.
 */
export function createWidgetAgent(
  options: CreateWidgetAgentOptions,
): WidgetAgent {
  const tools: WidgetTools & Partial<SpecTools> =
    options.tools ?? createWidgetTools();
  const maxRounds = Math.max(1, options.maxRounds ?? 3);
  const maxSteps = Math.max(1, options.maxSteps ?? 8);
  const settleMs = options.settleMs ?? 250;

  const generate = async (
    input: GenerateWidgetInput,
    generateOptions: GenerateOptions = {},
  ): Promise<GenerateWidgetResult> => {
    const mode: WidgetMode =
      input.mode === "spec" && tools.render_spec ? "spec" : "html";
    const title = slug(input.title ?? input.brief.split(/[.\n]/)[0] ?? "");
    const sink = generateOptions.sink ?? options.createSink?.({ title, mode });
    const signal = generateOptions.signal;
    const emit = (event: WidgetAgentEvent) => {
      options.onEvent?.(event);
      generateOptions.onEvent?.(event);
    };
    emit({ type: "start", title, mode });

    const names =
      mode === "html"
        ? (["read_me", "show_widget", "edit_widget"] as const)
        : (["read_me", "render_spec"] as const);
    const declarations: AgentToolDeclaration[] = [
      ...names.map((name) => {
        const tool = tools[name]!;
        return {
          name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        };
      }),
      ...Object.entries(options.extraTools ?? {}).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    ];

    const messages: AgentMessage[] = [
      {
        role: "system",
        content: systemPrompt(mode, title, options.instructions),
      },
      { role: "user", content: briefMessage(input) },
    ];

    let rounds = 0;
    let lastOk = false;
    let lastErrors: string[] = [];
    let code: string | undefined;
    let spec: Spec | undefined;
    let summary = "";
    /** A frame cannot restart a stream after it ended, so only the first show streams. */
    let streamUsed = false;

    const recordRender = (ok: boolean, text: string, errors: string[]) => {
      rounds++;
      lastOk = ok;
      lastErrors = ok ? [] : errors;
      emit({ type: "feedback", title, ok, text, round: rounds });
    };

    const check = async (nextCode: string): Promise<RenderReport> => {
      if (options.preview) return options.preview(nextCode);
      if (sink?.inspect) {
        await sleep(settleMs, signal);
        const inspection = await sink.inspect();
        return {
          errors: inspection.errors,
          console: inspection.console,
          blank: inspection.blank,
          height: inspection.size.height,
        };
      }
      return { errors: [], console: [], blank: false };
    };

    const renderHtml = async (nextCode: string, streamed: boolean) => {
      code = nextCode;
      emit({ type: "code", title, code: nextCode });
      if (streamed) await sink?.end?.();
      else await sink?.replace?.(nextCode);
      const report = await check(nextCode);
      const feedback = buildRepairFeedback(report, {
        round: rounds + 1,
        includeScreenshot: false,
      });
      recordRender(feedback.ok, feedback.text, [
        ...report.errors.map((error) => `${error.kind}: ${error.message}`),
        ...(report.blank ? ["The widget rendered blank."] : []),
      ]);
      return feedback.text;
    };

    const renderSpec = async (args: Record<string, unknown>) => {
      const result = await tools.render_spec!.execute({
        ...(args as object),
        title,
      });
      spec =
        args["spec"] && typeof args["spec"] === "object"
          ? { state: {}, ...(args["spec"] as Spec) }
          : typeof args["patches"] === "string"
            ? parseSpecStream(args["patches"], spec ? { initial: spec } : {})
                .spec
            : spec;
      if (spec) {
        sink?.spec?.(spec, { streaming: false });
        emit({ type: "spec", title, spec, streaming: false });
      }
      recordRender(
        result.ok,
        result.feedback,
        result.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => `${issue.path || "spec"}: ${issue.message}`),
      );
      return result.feedback;
    };

    for (let step = 0; step < maxSteps && !signal?.aborted; step++) {
      const pending = new Map<string, PendingCall>();
      const calls: AgentToolCall[] = [];
      let text = "";
      let live: { id: string; code: string } | undefined;
      let liveSpec:
        | { id: string; stream: SpecStream; consumed: string }
        | undefined;

      const onArgs = (id: string, call: PendingCall) => {
        const args = parsePartialJson(call.argsText) as
          | Record<string, unknown>
          | undefined;
        if (
          call.name === "show_widget" &&
          typeof args?.["widget_code"] === "string" &&
          !streamUsed &&
          (!live || live.id === id)
        ) {
          const next = args["widget_code"];
          live ??= { id, code: "" };
          if (next.length > live.code.length && next.startsWith(live.code)) {
            const delta = next.slice(live.code.length);
            live.code = next;
            sink?.write?.(delta);
            emit({ type: "code-delta", title, delta, code: next });
          }
        } else if (
          call.name === "render_spec" &&
          typeof args?.["patches"] === "string"
        ) {
          if (!liveSpec || liveSpec.id !== id) {
            liveSpec = {
              id,
              stream: createSpecStream(spec ? { initial: spec } : {}),
              consumed: "",
            };
          }
          const patches = args["patches"];
          if (
            patches.length > liveSpec.consumed.length &&
            patches.startsWith(liveSpec.consumed)
          ) {
            const before = liveSpec.stream.spec;
            liveSpec.stream.push(patches.slice(liveSpec.consumed.length));
            liveSpec.consumed = patches;
            const after = liveSpec.stream.spec;
            if (after !== before) {
              sink?.spec?.(after, { streaming: true });
              emit({ type: "spec", title, spec: after, streaming: true });
            }
          }
        }
      };

      for await (const event of options.model(messages, {
        tools: declarations,
        ...(signal ? { signal } : {}),
      })) {
        if (event.type === "text-delta") {
          text += event.text;
          emit({ type: "text-delta", text: event.text });
        } else if (event.type === "tool-call-delta") {
          const call = pending.get(event.id) ?? { name: "", argsText: "" };
          if (event.name) call.name = event.name;
          call.argsText += event.argsTextDelta;
          pending.set(event.id, call);
          onArgs(event.id, call);
        } else if (event.type === "tool-call") {
          calls.push({ id: event.id, name: event.name, args: event.args });
        }
      }

      messages.push({
        role: "assistant",
        content: text,
        ...(calls.length ? { toolCalls: calls } : {}),
      });
      if (calls.length === 0) {
        summary = text.trim();
        break;
      }

      for (const call of calls) {
        const args = (call.args ?? {}) as Record<string, unknown>;
        let content: string;
        try {
          if (call.name === "read_me") {
            emit({ type: "status", text: "Reading the guidelines" });
            content = await tools.read_me.execute(args as never);
          } else if (call.name === "show_widget" && mode === "html") {
            const result = await tools.show_widget.execute({
              ...(args as ShowWidgetInput),
              title,
            });
            if (!result.ok) {
              content = JSON.stringify(result);
            } else {
              const nextCode = String(args["widget_code"]);
              const streamed =
                !streamUsed &&
                live?.id === call.id &&
                nextCode.startsWith(live.code);
              if (streamed && nextCode.length > live!.code.length) {
                const delta = nextCode.slice(live!.code.length);
                sink?.write?.(delta);
                emit({ type: "code-delta", title, delta, code: nextCode });
              }
              streamUsed = true;
              content = await renderHtml(nextCode, streamed);
            }
          } else if (call.name === "edit_widget" && mode === "html") {
            const result = await tools.edit_widget.execute({
              ...(args as EditWidgetInput),
              title,
            });
            const applied = result.ok
              ? applyWidgetEdits(code ?? "", args["edits"] as WidgetEdit[])
              : undefined;
            if (applied?.ok) {
              content = await renderHtml(applied.code, false);
            } else {
              content = result.ok ? applied!.error : result.error;
              recordRender(false, content, [content]);
            }
          } else if (call.name === "render_spec" && mode === "spec") {
            content = await renderSpec(args);
          } else if (
            options.extraTools &&
            Object.hasOwn(options.extraTools, call.name)
          ) {
            const output = await options.extraTools[call.name]!.execute(
              args as never,
            );
            content =
              typeof output === "string" ? output : JSON.stringify(output);
          } else {
            content = `Unknown tool "${call.name}".`;
          }
        } catch (error) {
          content = `Tool failed: ${error instanceof Error ? error.message : String(error)}`;
        }
        messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content,
        });
      }
      if (!lastOk && rounds >= maxRounds) break;
    }

    const result: GenerateWidgetResult = {
      ok: lastOk,
      title,
      mode,
      summary,
      errors: rounds === 0 ? ["The widget was never rendered."] : lastErrors,
      ...(code !== undefined ? { code } : {}),
      ...(spec !== undefined ? { spec } : {}),
      rounds,
    };
    emit({ type: "done", result });
    return result;
  };

  return {
    generate,
    tool: {
      name: "generate_widget",
      description:
        "Has a widget specialist build a visual widget (chart, diagram, small interactive tool) or app-native UI from a brief, streams it to the user, checks it, and fixes problems. Returns a short summary. Describe the widget fully in `brief` and pass any data in `data`.",
      inputSchema: GENERATE_WIDGET_SCHEMA,
      execute: (input) => generate(input),
    },
  };
}
