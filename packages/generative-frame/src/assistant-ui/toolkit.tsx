import {
  useAssistantInstructions,
  useAui,
  useAuiState,
  useToolArgsStatus,
  type Toolkit,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { previewWidget } from "../preview";
import type { ConsoleEntry, WidgetError } from "../protocol";
import { buildRepairFeedback } from "../repair/repair";
import { useThemeTokens } from "../react/useThemeTokens";
import { syncWidgetCode } from "../react/sync";
import { useWidget, type UseWidgetOptions } from "../react/useWidget";
import type { ThemeTokenSources } from "../theme";
import { createWidgetRegistry, type WidgetRegistry } from "../tools/registry";
import {
  buildWidgetInstructions,
  createWidgetTools,
  type CreateWidgetToolsOptions,
  type EditWidgetInput,
  type PreviewWidgetInput,
  type ShowWidgetInput,
  type WidgetInstructionsOptions,
  type WidgetTools,
} from "../tools/tools";
import type { AnyTool, ToolDefinition } from "../tools/define";
import {
  toolkitEntry,
  type ToolkitDisplay,
  type WidgetToolkitExtension,
} from "./extension";
import { resolveWidgetCode, resolveWidgetOrigin } from "./history";

/**
 * Where theme tokens come from in an assistant-ui app: shadcn/ui variables
 * first, because Tailwind v4 aliases `--color-accent` to shadcn's muted
 * `--accent` rather than the primary color.
 */
export const ASSISTANT_UI_TOKEN_SOURCES: ThemeTokenSources = {
  "--color-background": ["--background"],
  "--color-surface": ["--card", "--background"],
  "--color-surface-muted": ["--muted", "--secondary"],
  "--color-text": ["--foreground"],
  "--color-text-muted": ["--muted-foreground"],
  "--color-text-subtle": ["--muted-foreground"],
  "--color-border": ["--border"],
  "--color-border-strong": ["--input", "--border"],
  "--color-accent": ["--primary"],
  "--color-accent-text": ["--primary-foreground"],
  "--color-danger": ["--destructive"],
  "--color-success": ["--aui-success", "--color-success"],
  "--color-warning": ["--aui-warning", "--color-warning"],
  "--color-info": ["--color-info"],
};

/** The app's assistant-ui (shadcn/ui) theme as widget tokens, kept in sync. */
export function useAssistantUiThemeTokens(element?: Element | null) {
  return useThemeTokens(element, ASSISTANT_UI_TOKEN_SOURCES);
}

export type WidgetToolkitOptions = Omit<
  CreateWidgetToolsOptions,
  "registry"
> & {
  registry?: WidgetRegistry;
  /**
   * `frontend` (default): the tools execute in the browser and the server
   * forwards their schemas (`frontendTools` from `@assistant-ui/ai-sdk`).
   * `backend`: the server executes `createWidgetTools()` and the toolkit
   * only renders.
   */
  execution?: "frontend" | "backend";
  /** Options for every widget frame (csp, product, maxHeight, handlers, …). */
  widget?: Omit<UseWidgetOptions, "tokens">;
  /** Spec mode: `createSpecToolkit(catalog, { components })` from `generative-frame/spec/assistant-ui`. */
  spec?: WidgetToolkitExtension;
  /** More tools for the model, such as data lookups. They execute like the widget tools and render nothing in the thread. */
  extraTools?: Record<string, AnyTool>;
  /** Where the theme is read from. Defaults to the document root. */
  themeElement?: Element | null;
  /** How the widget tools are presented relative to the reasoning trace. Defaults to `standalone`. */
  display?: ToolkitDisplay;
  /**
   * With frontend execution, `show_widget` and `edit_widget` wait for the
   * frame to finish rendering and return its errors as `render`. `false`
   * returns as soon as the code is stored.
   */
  renderReport?: RenderReportOptions | false;
  /** Keep the PNG in `preview_widget` results. Defaults to false. */
  previewScreenshot?: boolean;
  /**
   * The storage id of a widget's frame, from the `toolCallId` of the
   * `show_widget` call that created it, so a widget keeps its localStorage
   * across reloads and edits. Defaults to `aui:<toolCallId>`; `false` gives
   * every frame a fresh origin. Derive it from host data only, never from
   * tool arguments the model wrote.
   */
  widgetId?: false | ((call: { toolCallId: string }) => string);
};

export type RenderReportOptions = {
  /** How long a tool result waits for the frame. Defaults to 10000 ms. */
  timeoutMs?: number;
  /** Wait after the code ends so late script errors are caught. Defaults to 300 ms. */
  settleMs?: number;
};

/** How a widget rendered in the thread, attached to tool results as `render`. */
export type WidgetRenderReport =
  | {
      status: "rendered";
      ok: boolean;
      blank: boolean;
      height: number;
      errors: WidgetError[];
      /** Console warnings and errors, most recent last. */
      console: ConsoleEntry[];
      feedback: string;
    }
  | { status: "timeout"; feedback: string };

export type WidgetToolkit = {
  /** Pass to `Tools({ toolkit })`, or spread into your own toolkit. */
  toolkit: Toolkit;
  /** The tool definitions behind the toolkit, for instructions or the server. */
  tools: WidgetTools & Record<string, AnyTool>;
  /** Latest code per widget title. */
  registry: WidgetRegistry;
};

type ShowArgs = Partial<ShowWidgetInput>;
type EditArgs = Partial<EditWidgetInput>;

const REPORT_BACKLOG = 50;

/** Hands render reports from the thread's widgets to the tool calls waiting for them. */
function createRenderReports() {
  const early = new Map<string, WidgetRenderReport>();
  const waiters = new Map<string, (report: WidgetRenderReport) => void>();
  return {
    report(toolCallId: string, report: WidgetRenderReport) {
      const waiter = waiters.get(toolCallId);
      if (waiter) {
        waiters.delete(toolCallId);
        waiter(report);
        return;
      }
      early.set(toolCallId, report);
      // Calls rendered from history never execute, so their reports are dropped.
      if (early.size > REPORT_BACKLOG) {
        early.delete(early.keys().next().value as string);
      }
    },
    wait(
      toolCallId: string,
      timeoutMs: number,
      signal?: AbortSignal,
    ): Promise<WidgetRenderReport> {
      const ready = early.get(toolCallId);
      if (ready) {
        early.delete(toolCallId);
        return Promise.resolve(ready);
      }
      return new Promise((resolve) => {
        const finish = (report: WidgetRenderReport) => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          waiters.delete(toolCallId);
          resolve(report);
        };
        const timedOut = () =>
          finish({
            status: "timeout",
            feedback: `The widget had not finished rendering after ${timeoutMs} ms, so no render errors are known.`,
          });
        const onAbort = timedOut;
        const timer = setTimeout(timedOut, timeoutMs);
        signal?.addEventListener("abort", onAbort, { once: true });
        waiters.set(toolCallId, finish);
      });
    },
  };
}

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

/**
 * Renders `show_widget`, `edit_widget`, and `render_spec` tool calls in an
 * assistant-ui thread: widget code streams into a frame from the partial
 * tool arguments, `sendPrompt` appends a user message to the thread, and the
 * frame follows the app's theme. With `execution: "frontend"` the tools run
 * in the browser too, so the server only forwards their schemas.
 */
export function createWidgetToolkit(
  options: WidgetToolkitOptions = {},
): WidgetToolkit {
  const registry = options.registry ?? createWidgetRegistry();
  const tools: WidgetTools & Record<string, AnyTool> = createWidgetTools({
    ...options,
    preview: options.preview ?? previewWidget,
    registry,
    modules: [...(options.modules ?? []), ...(options.spec?.modules ?? [])],
    extraTools: { ...options.extraTools, ...options.spec?.tools },
  });
  const display = options.display ?? "standalone";
  const execution = options.execution ?? "frontend";
  const reports = createRenderReports();
  const reportOptions =
    options.renderReport === false ? undefined : (options.renderReport ?? {});
  const settleMs = reportOptions?.settleMs ?? 300;
  const timeoutMs = reportOptions?.timeoutMs ?? 10_000;

  function useWidgetProps() {
    const aui = useAui();
    const tokens = useAssistantUiThemeTokens(options.themeElement);
    return {
      ...options.widget,
      tokens,
      onPrompt:
        options.widget?.onPrompt ??
        ((text: string) => {
          aui.thread.append(text);
        }),
    };
  }

  const widgetId = (originToolCallId: string | undefined) => {
    if (options.widgetId === false || !originToolCallId) return undefined;
    return options.widgetId
      ? options.widgetId({ toolCallId: originToolCallId })
      : `aui:${originToolCallId}`;
  };

  function ToolWidget({
    code,
    streaming,
    toolCallId,
    storageId,
  }: {
    code: string;
    streaming: boolean;
    toolCallId: string;
    storageId: string | undefined;
  }) {
    const widgetProps = useWidgetProps();
    const { ref, widget } = useWidget(
      storageId !== undefined && !widgetProps.frame
        ? { ...widgetProps, id: storageId }
        : widgetProps,
    );

    useEffect(() => {
      if (!widget || !reportOptions) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const off = widget.on("end", () => {
        off();
        timer = setTimeout(() => {
          widget
            .inspect()
            .then((inspection) => {
              const feedback = buildRepairFeedback({
                errors: inspection.errors,
                console: inspection.console,
                blank: inspection.blank,
                height: inspection.size.height,
              });
              reports.report(toolCallId, {
                status: "rendered",
                ok: feedback.ok,
                blank: feedback.blank,
                height: inspection.size.height,
                errors: feedback.errors,
                console: feedback.console,
                feedback: feedback.text,
              });
            })
            .catch(() => {});
        }, settleMs);
      });
      return () => {
        off();
        clearTimeout(timer);
      };
    }, [widget, toolCallId]);

    useEffect(() => {
      if (widget) syncWidgetCode(widget, code, streaming);
    }, [widget, code, streaming]);

    return <div ref={ref} />;
  }

  function ShowWidgetUI({
    args,
    toolCallId,
  }: ToolCallMessagePartProps<ShowArgs>) {
    const { propStatus } = useToolArgsStatus<ShowWidgetInput>();
    const streaming = propStatus.widget_code !== "complete";
    const code = typeof args.widget_code === "string" ? args.widget_code : "";
    const title = typeof args.title === "string" ? args.title : "";

    useEffect(() => {
      if (streaming || !title || !code) return;
      if (registry.get(title)?.code !== code) registry.set(title, code);
    }, [streaming, title, code]);

    const status = args.loading_messages?.[0];
    return (
      <div data-gf-widget={title || undefined}>
        {streaming && !code && status ? (
          <p role="status" style={{ margin: "4px 0", opacity: 0.7 }}>
            {status}
          </p>
        ) : null}
        <ToolWidget
          code={code}
          streaming={streaming}
          toolCallId={toolCallId}
          storageId={widgetId(toolCallId)}
        />
      </div>
    );
  }

  function EditWidgetUI({
    args,
    toolCallId,
  }: ToolCallMessagePartProps<EditArgs>) {
    const { argsStatus } = useToolArgsStatus<EditWidgetInput>();
    const messages = useAuiState((s) => s.thread.messages);
    const title = typeof args.title === "string" ? args.title : "";
    const complete = argsStatus === "complete";
    const code = useMemo(
      () => (complete ? resolveWidgetCode(messages, toolCallId) : undefined),
      [complete, messages, toolCallId],
    );
    const origin = useMemo(
      () => (complete ? resolveWidgetOrigin(messages, toolCallId) : undefined),
      [complete, messages, toolCallId],
    );

    useEffect(() => {
      if (!title || code === undefined) return;
      if (registry.get(title)?.code !== code) registry.set(title, code);
    }, [title, code]);

    if (!complete) {
      return (
        <p role="status" style={{ margin: "4px 0", opacity: 0.7 }}>
          Updating {title || "widget"}…
        </p>
      );
    }
    if (code === undefined) {
      return (
        <p role="note" style={{ margin: "4px 0", opacity: 0.7 }}>
          {title || "The widget"} could not be updated.
        </p>
      );
    }
    return (
      <div data-gf-widget={title || undefined}>
        <span style={visuallyHidden}>Updated {title}</span>
        <ToolWidget
          code={code}
          streaming={false}
          toolCallId={toolCallId}
          storageId={widgetId(origin)}
        />
      </div>
    );
  }

  const Silent = () => null;

  type ExecuteContext = { toolCallId: string; abortSignal?: AbortSignal };

  const entry = <I, O>(
    tool: ToolDefinition<I, O>,
    render: ComponentType<ToolCallMessagePartProps<never>>,
    entryDisplay: ToolkitDisplay,
    execute?: (input: I, context: ExecuteContext) => Promise<unknown>,
  ) =>
    toolkitEntry(tool, render, { execution, display: entryDisplay }, execute);

  const withRenderReport =
    <I,>(tool: ToolDefinition<I, { ok: boolean }>) =>
    async (input: I, context: ExecuteContext) => {
      const result = await tool.execute(input);
      if (!result.ok || !reportOptions) return result;
      const render = await reports.wait(
        context.toolCallId,
        timeoutMs,
        context.abortSignal,
      );
      return { ...result, render };
    };

  const preview = async (input: PreviewWidgetInput) => {
    const { screenshot, ...result } = await tools.preview_widget.execute(input);
    const feedback = buildRepairFeedback(result).text;
    return options.previewScreenshot && screenshot !== undefined
      ? { ...result, screenshot, feedback }
      : { ...result, feedback };
  };

  const toolkit: Record<string, unknown> = {
    read_me: entry(tools.read_me, Silent, "inline"),
    show_widget: entry(
      tools.show_widget,
      ShowWidgetUI as never,
      display,
      withRenderReport(tools.show_widget),
    ),
    edit_widget: entry(
      tools.edit_widget,
      EditWidgetUI as never,
      display,
      withRenderReport(tools.edit_widget),
    ),
    preview_widget: entry(tools.preview_widget, Silent, "inline", preview),
    ...Object.fromEntries(
      Object.entries(options.extraTools ?? {}).map(([name, tool]) => [
        name,
        entry(tool, Silent, "inline"),
      ]),
    ),
    ...options.spec?.entries({ execution, display }),
  };

  return { toolkit: toolkit as Toolkit, tools, registry };
}

/**
 * Adds the widget instructions (when to use the tools, optionally with
 * `read_me` guidance preloaded) to the system prompt sent with each run.
 */
export function useWidgetInstructions(
  tools: WidgetTools & Record<string, AnyTool>,
  options: WidgetInstructionsOptions = {},
): void {
  const [instruction, setInstruction] = useState("");
  const preloadKey = JSON.stringify(options.preload ?? null);
  useEffect(() => {
    let cancelled = false;
    const preload = JSON.parse(preloadKey) as
      | WidgetInstructionsOptions["preload"]
      | null;
    void buildWidgetInstructions(tools, preload ? { preload } : {}).then(
      (text) => {
        if (!cancelled) setInstruction(text);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tools, preloadKey]);
  useAssistantInstructions({ instruction, disabled: !instruction });
}
