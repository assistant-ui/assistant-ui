import {
  useAuiState,
  useToolArgsStatus,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { useState, type ComponentType } from "react";
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

    return (
      <div data-gf-spec={title || undefined}>
        <SpecRenderer
          spec={spec}
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
    modules: [specGuidanceModule(catalog, options.specPrompt ?? {})],
    entries: (context) => ({
      render_spec: toolkitEntry(
        tools.render_spec,
        RenderSpecUI as never,
        context,
      ),
    }),
  };
}
