import {
  useAuiState,
  useToolArgsStatus,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { useMemo, useState, type ComponentType } from "react";
import {
  toolkitEntry,
  type WidgetToolkitExtension,
} from "../../assistant-ui/extension";
import { toolCalls, type MessageLike } from "../../assistant-ui/tool-calls";
import type { ActionHandler } from "../actions";
import type { Catalog } from "../catalog";
import type { SpecPromptOptions } from "../prompt";
import {
  SpecRenderer,
  type SpecComponents,
  type SpecPlaceholderProps,
} from "../react/SpecRenderer";
import { useSpecStream } from "../react/useSpecStream";
import {
  createSpecTools,
  specGuidanceModule,
  type RenderSpecInput,
} from "../render-spec";
import type { SpecStateStore } from "../state";
import { parseSpecStream } from "../stream";
import type { Spec } from "../types";

export type SpecToolkitOptions = {
  /** Implementations for the catalog's components. */
  components: SpecComponents;
  /** Action handlers by name. */
  handlers?: Record<string, ActionHandler>;
  onAction?: (
    name: string,
    params: Record<string, unknown>,
    context: { elementId?: string; trigger?: string; state: SpecStateStore },
  ) => unknown;
  placeholder?: ComponentType<SpecPlaceholderProps>;
  /** Options for the catalog guidance in `read_me`'s `spec` module. */
  specPrompt?: Omit<SpecPromptOptions, "mode">;
};

type SpecArgs = Partial<RenderSpecInput>;

const WIDGET_TOOLS = new Set([
  "read_me",
  "show_widget",
  "edit_widget",
  "preview_widget",
  "render_spec",
]);

/**
 * Results of the tool calls before this one, by tool name and in call order,
 * leaving out the widget toolkit's own tools. Tool names and call order are
 * keys every model can see, unlike call ids, which some formats never show.
 */
function resolveToolResults(
  messages: readonly MessageLike[],
  toolCallId: string,
): Record<string, unknown[]> {
  const results: Record<string, unknown[]> = Object.create(null);
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) break;
    if (WIDGET_TOOLS.has(call.name)) continue;
    (results[call.name] ??= []).push(decodeResult(call.result));
  }
  return results;
}

/** A string result that holds a JSON object or array is decoded, since the model read that string as the structure. */
function decodeResult(result: unknown): unknown {
  if (typeof result !== "string") return result;
  try {
    const value: unknown = JSON.parse(result);
    return typeof value === "object" && value !== null ? value : result;
  } catch {
    return result;
  }
}

/**
 * The spec a `render_spec` call's patches apply onto: the result of the
 * earlier `render_spec` calls with the same title in the thread.
 */
export function resolveSpecBase(
  messages: readonly MessageLike[],
  toolCallId: string,
  title: string,
): Spec | undefined {
  let spec: Spec | undefined;
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) return spec;
    if (call.name !== "render_spec" || call.args["title"] !== title) continue;
    if (call.args["spec"] && typeof call.args["spec"] === "object") {
      spec = { state: {}, ...(call.args["spec"] as Spec) };
    } else if (typeof call.args["patches"] === "string") {
      spec = parseSpecStream(
        call.args["patches"],
        spec ? { initial: spec } : {},
      ).spec;
    }
  }
  return spec;
}

/**
 * Spec mode for `createWidgetToolkit({ spec })`: adds `render_spec`, which
 * streams patches into a `<SpecRenderer>` with your components, and the
 * `spec` module of `read_me`.
 */
export function createSpecToolkit(
  catalog: Catalog,
  options: SpecToolkitOptions,
): WidgetToolkitExtension {
  const tools = createSpecTools(catalog);

  function RenderSpecUI({
    args,
    toolCallId,
  }: ToolCallMessagePartProps<SpecArgs>) {
    const { argsStatus } = useToolArgsStatus<RenderSpecInput>();
    const streaming = argsStatus !== "complete";
    const messages = useAuiState((s) => s.thread.messages);
    const title = typeof args.title === "string" ? args.title : "";
    // The base and the tool results only depend on earlier calls, so they are read once per call.
    const [base] = useState(() => resolveSpecBase(messages, toolCallId, title));
    const [toolResults] = useState(() =>
      resolveToolResults(messages, toolCallId),
    );
    const streamed = useSpecStream({
      source: typeof args.patches === "string" ? args.patches : "",
      complete: !streaming,
      ...(base ? { initial: base } : {}),
    });
    const inputSpec = args.spec;
    const spec = useMemo(
      () =>
        inputSpec &&
        typeof inputSpec === "object" &&
        typeof inputSpec.root === "string"
          ? ({ state: {}, ...inputSpec } as Spec)
          : streamed.spec,
      [inputSpec, streamed.spec],
    );
    const renderState = useMemo(
      () => ({ ...spec.state, tools: toolResults }),
      [spec.state, toolResults],
    );
    const renderSpec = useMemo(
      () => ({ ...spec, state: renderState }),
      [spec, renderState],
    );

    return (
      <div data-gf-spec={title || undefined}>
        <SpecRenderer
          spec={renderSpec}
          catalog={catalog}
          components={options.components}
          streaming={streaming}
          {...(options.handlers ? { handlers: options.handlers } : {})}
          {...(options.onAction ? { onAction: options.onAction } : {})}
          {...(options.placeholder ? { placeholder: options.placeholder } : {})}
        />
      </div>
    );
  }

  return {
    tools,
    modules: [
      specGuidanceModule(catalog, {
        ...options.specPrompt,
        customRules: [
          ...(options.specPrompt?.customRules ?? []),
          'Results of earlier tool calls are in state under `/tools/<toolName>/<n>`, one entry per call to that tool in the order you made them, starting at 0. Show their values with `{ "$state": "/tools/<toolName>/<n>/..." }` rather than copying them, and never write `tools` in `state`.',
        ],
      }),
    ],
    entries: (context) => ({
      render_spec: toolkitEntry(
        tools.render_spec,
        RenderSpecUI as never,
        context,
      ),
    }),
  };
}
