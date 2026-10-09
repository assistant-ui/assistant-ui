import {
  useAssistantInstructions,
  useAui,
  useAuiState,
  useToolArgsStatus,
  type Toolkit,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { ActionHandler } from "../spec/actions";
import type { SpecStateStore } from "../spec/state";
import type { Spec } from "../spec/types";
import {
  SpecRenderer,
  type SpecComponents,
  type SpecPlaceholderProps,
} from "../react/SpecRenderer";
import { useSpecStream } from "../react/useSpecStream";
import { useThemeTokens } from "../react/useThemeTokens";
import { Widget } from "../react/Widget";
import type { UseWidgetOptions } from "../react/useWidget";
import type { ThemeTokenSources } from "../theme";
import { createWidgetRegistry, type WidgetRegistry } from "../tools/registry";
import {
  buildWidgetInstructions,
  createWidgetTools,
  type CreateWidgetToolsOptions,
  type EditWidgetInput,
  type RenderSpecInput,
  type ShowWidgetInput,
  type SpecTools,
  type ToolDefinition,
  type WidgetInstructionsOptions,
  type WidgetTools,
} from "../tools/tools";
import { resolveSpecBase, resolveWidgetCode } from "./history";

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
  "registry" | "specs"
> & {
  registry?: WidgetRegistry;
  /**
   * `frontend` (default): the tools execute in the browser and the server
   * forwards their schemas (`frontendTools` from `@assistant-ui/ai-sdk`).
   * `backend`: the server executes `createWidgetTools()` and the toolkit
   * only renders.
   */
  execution?: "frontend" | "backend";
  /** Options for every widget frame (csp, product, maxHeight, compat, handlers, …). */
  widget?: Omit<UseWidgetOptions, "tokens">;
  /** Implementations for the catalog's components; required to render `render_spec`. */
  components?: SpecComponents;
  /** Spec action handlers by name. */
  handlers?: Record<string, ActionHandler>;
  onAction?: (
    name: string,
    params: Record<string, unknown>,
    context: { elementId?: string; trigger?: string; state: SpecStateStore },
  ) => unknown;
  placeholder?: ComponentType<SpecPlaceholderProps>;
  /** Where the theme is read from. Defaults to the document root. */
  themeElement?: Element | null;
  /** How the widget tools are presented relative to the reasoning trace. Defaults to `standalone`. */
  display?: "standalone" | "inline";
};

export type WidgetToolkit = {
  /** Pass to `Tools({ toolkit })`, or spread into your own toolkit. */
  toolkit: Toolkit;
  /** The tool definitions behind the toolkit, for instructions or the server. */
  tools: WidgetTools & Partial<SpecTools>;
  /** Latest code per widget title. */
  registry: WidgetRegistry;
};

type ShowArgs = Partial<ShowWidgetInput>;
type EditArgs = Partial<EditWidgetInput>;
type SpecArgs = Partial<RenderSpecInput>;

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
  const specs = new Map<string, { spec: Spec; version: number }>();
  const tools: WidgetTools & Partial<SpecTools> = createWidgetTools({
    ...options,
    registry,
    specs,
  });
  const display = options.display ?? "standalone";

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

  function ShowWidgetUI({ args }: ToolCallMessagePartProps<ShowArgs>) {
    const { propStatus } = useToolArgsStatus<ShowWidgetInput>();
    const streaming = propStatus.widget_code !== "complete";
    const code = typeof args.widget_code === "string" ? args.widget_code : "";
    const title = typeof args.title === "string" ? args.title : "";
    const widgetProps = useWidgetProps();

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
        <Widget {...widgetProps} code={code} streaming={streaming} />
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
    const widgetProps = useWidgetProps();

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
        <Widget {...widgetProps} code={code} streaming={false} />
      </div>
    );
  }

  function RenderSpecUI({
    args,
    toolCallId,
  }: ToolCallMessagePartProps<SpecArgs>) {
    const { argsStatus } = useToolArgsStatus<RenderSpecInput>();
    const streaming = argsStatus !== "complete";
    const messages = useAuiState((s) => s.thread.messages);
    const title = typeof args.title === "string" ? args.title : "";
    // The base only depends on earlier calls, so it is read once per call.
    const [base] = useState(() => resolveSpecBase(messages, toolCallId, title));
    const streamed = useSpecStream({
      source: typeof args.patches === "string" ? args.patches : "",
      complete: !streaming,
      ...(base ? { initial: base } : {}),
    });
    const spec =
      args.spec &&
      typeof args.spec === "object" &&
      typeof args.spec.root === "string"
        ? ({ state: {}, ...args.spec } as Spec)
        : streamed.spec;

    if (!options.catalog || !options.components) {
      return (
        <p role="note" style={{ margin: "4px 0", opacity: 0.7 }}>
          No components are configured for render_spec.
        </p>
      );
    }
    return (
      <div data-gf-spec={title || undefined}>
        <SpecRenderer
          spec={spec}
          catalog={options.catalog}
          components={options.components}
          streaming={streaming}
          {...(options.handlers ? { handlers: options.handlers } : {})}
          {...(options.onAction ? { onAction: options.onAction } : {})}
          {...(options.placeholder ? { placeholder: options.placeholder } : {})}
        />
      </div>
    );
  }

  const Silent = () => null;

  const entry = <I, O>(
    tool: ToolDefinition<I, O>,
    render: ComponentType<ToolCallMessagePartProps<never>>,
    entryDisplay: "standalone" | "inline",
  ) =>
    options.execution === "backend"
      ? { type: "backend" as const, display: entryDisplay, render }
      : {
          type: "frontend" as const,
          display: entryDisplay,
          description: tool.description,
          parameters: tool.inputSchema as never,
          execute: (input: I) => tool.execute(input),
          render,
        };

  const toolkit: Record<string, unknown> = {
    read_me: entry(tools.read_me, Silent, "inline"),
    show_widget: entry(tools.show_widget, ShowWidgetUI as never, display),
    edit_widget: entry(tools.edit_widget, EditWidgetUI as never, display),
    ...(tools.render_spec
      ? {
          render_spec: entry(tools.render_spec, RenderSpecUI as never, display),
        }
      : {}),
  };

  return { toolkit: toolkit as Toolkit, tools, registry };
}

/**
 * Adds the widget instructions (when to use the tools, optionally with
 * `read_me` guidance preloaded) to the system prompt sent with each run.
 */
export function useWidgetInstructions(
  tools: WidgetTools & Partial<SpecTools>,
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
