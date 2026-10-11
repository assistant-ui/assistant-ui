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

/** Results of the tool calls before this one, by call id, leaving out the widget toolkit's own tools. */
function resolveToolResults(
  messages: readonly MessageLike[],
  toolCallId: string,
): Record<string, unknown> {
  const results: Record<string, unknown> = Object.create(null);
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) break;
    if (call.result !== undefined && !WIDGET_TOOLS.has(call.name)) {
      results[call.id] = call.result;
    }
  }
  return results;
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
    const renderSpec = useMemo(
      () => ({ ...spec, state: { ...spec.state, tools: toolResults } }),
      [spec, toolResults],
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
          'Results of earlier tool calls are in state under `/tools/<toolCallId>`. Show their values with `{ "$state": "/tools/<toolCallId>/..." }` instead of copying them, and never write `tools` in `state`.',
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
