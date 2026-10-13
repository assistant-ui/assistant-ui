import type { Toolkit } from "@assistant-ui/core/react";
import { useAui, useAuiState, type ToolUIProps } from "@assistant-ui/vue";
import {
  computed,
  defineComponent,
  h,
  onScopeDispose,
  watch,
  type Component,
  type PropType,
} from "vue";
import { toolkitEntry } from "../../assistant-ui/entry";
import type {
  ToolkitDisplay,
  ToolkitExecution,
  WidgetToolkitExtension,
} from "../../assistant-ui/extension";
import {
  createSharedContext,
  savedContext,
  toSharedContext,
  type SharedContext,
} from "../../assistant-ui/modelContext";
import { createSnapshotSaver } from "../../assistant-ui/snapshotSaver";
import type { ActionHandler } from "../actions";
import type { Catalog } from "../catalog";
import type { SpecPromptOptions } from "../prompt";
import {
  createStateStore,
  type SpecStateStore,
  type SpecStateWrite,
} from "../state";
import type { Spec } from "../types";
import { SpecRenderer, type SpecComponents } from "../vue/SpecRenderer";
import { useSpecStream } from "../vue/useSpecStream";
import {
  callHistory,
  createSpecCalls,
  resolveSpecBase,
  resolveToolResults,
  savedWrites,
  specModules,
  type InteractionLog,
  type SpecArgs,
} from "./thread";

export type SpecToolkitOptions = {
  /** Vue components for the catalog's components. */
  components: SpecComponents;
  /** Action handlers by name. */
  handlers?: Record<string, ActionHandler>;
  onAction?: (
    name: string,
    params: Record<string, unknown>,
    context: { elementId?: string; trigger?: string; state: SpecStateStore },
  ) => unknown;
  placeholder?: Component;
  /** Options for the catalog guidance in the `spec` module. */
  specPrompt?: Omit<SpecPromptOptions, "mode">;
};

/** The Vue spec toolkit, whose entries go into `Tools({ toolkit })` from `@assistant-ui/core/react`. */
export type VueSpecToolkit = Omit<WidgetToolkitExtension, "entries"> & {
  entries(context: {
    execution: ToolkitExecution;
    display: ToolkitDisplay;
  }): Toolkit;
};

/**
 * Spec mode for `@assistant-ui/vue`: `render_spec`, which streams patches into
 * the Vue `SpecRenderer` with your components. Pass `entries({ execution,
 * display })` to `Tools({ toolkit })`, and give the model the guidance of the
 * `spec` module in `modules`.
 */
export function createSpecToolkit(
  catalog: Catalog,
  options: SpecToolkitOptions,
): VueSpecToolkit {
  const { tools, histories, execute } = createSpecCalls(catalog);

  const renderSpec = (mountsToolResults: boolean) =>
    defineComponent({
      name: "RenderSpec",
      props: {
        tool: { type: Object as PropType<ToolUIProps>, required: true },
      },
      setup(props) {
        const aui = useAui();
        const messages = useAuiState((s) => s.thread.messages);
        const part = () => props.tool.part;
        const toolCallId = part().toolCallId;
        const args = computed(() => part().args as SpecArgs);
        const title = computed(() =>
          typeof args.value.title === "string" ? args.value.title : "",
        );
        // Vue has no partial-JSON status for tool arguments, so the call streams until it stops running.
        const streaming = computed(() => part().status.type === "running");
        const interactions = part().unstable_interactions as
          | InteractionLog
          | undefined;

        // Earlier calls do not change, so the thread is read once per call; the base follows the title, which may still be streaming when the call mounts.
        const earlier = messages.value;
        const base = computed(() =>
          resolveSpecBase(earlier, toolCallId, title.value),
        );
        const toolResults = mountsToolResults
          ? resolveToolResults(earlier, toolCallId)
          : undefined;
        const history = callHistory(earlier, toolCallId);
        histories.set(toolCallId, history);
        onScopeDispose(() => {
          if (histories.get(toolCallId) === history)
            histories.delete(toolCallId);
        });

        const streamed = useSpecStream({
          source: () =>
            typeof args.value.patches === "string" ? args.value.patches : "",
          complete: () => !streaming.value,
          initial: base,
        });
        // A stream reads its base when it starts, so it starts over when the title brings a new one.
        watch(base, () => streamed.reset());
        const spec = computed(() => {
          const input = args.value.spec;
          return input &&
            typeof input === "object" &&
            typeof input.root === "string"
            ? ({ state: {}, ...input } as Spec)
            : streamed.spec.value;
        });
        const specState = computed(() => spec.value.state);
        const renderState = computed(() =>
          toolResults && specState.value?.["tools"] === undefined
            ? { ...specState.value, tools: toolResults }
            : undefined,
        );
        const renderSpec = computed(() =>
          renderState.value
            ? { ...spec.value, state: renderState.value }
            : spec.value,
        );

        const store = createStateStore(renderSpec.value.state ?? {}, {
          writes: savedWrites(interactions, toolCallId),
        });
        watch(
          () => renderSpec.value.state,
          (state) => {
            if (state) store.seed(state);
          },
          { immediate: true },
        );

        const initialContext = savedContext(
          interactions,
          toolCallId,
          "setState",
        );
        let context = initialContext;
        const snapshot = () => ({
          writes: store.writes(),
          ...(context ? { context } : {}),
        });
        const saver = createSnapshotSaver<{
          writes: readonly SpecStateWrite[];
          context?: SharedContext;
        }>(snapshot(), (saved) =>
          props.tool.unstable_recordInteraction?.({
            type: "action",
            payload: {
              type: "setState",
              toolCallId,
              writes: saved?.writes ?? null,
              ...(saved?.context ? { context: saved.context } : {}),
            },
          }),
        );
        const shared = createSharedContext(
          options.handlers?.["updateModelContext"] ? undefined : initialContext,
          {
            name: () => title.value || toolCallId,
            onShare: (next) => {
              context = next;
              saver.schedule(snapshot);
            },
          },
        );
        onScopeDispose(
          aui.modelContext.register({
            getModelContext: () => {
              const system = shared.source.read();
              return system ? { system } : {};
            },
            subscribe: shared.source.subscribe,
          }),
        );
        const handlers: Record<string, ActionHandler> = {
          sendMessage: (params, source) => {
            const text = params["text"];
            if (source.kind === "watch") return;
            if (typeof text === "string" && text.trim())
              aui.thread.append(text);
          },
          updateModelContext: (params) =>
            shared.share(toSharedContext(params["text"], params["data"])),
          ...options.handlers,
        };
        const unsubscribe = store.subscribe(() => saver.schedule(snapshot));
        onScopeDispose(() => {
          unsubscribe();
          saver.flush();
        });

        return () =>
          h("div", { "data-gf-spec": title.value || undefined }, [
            h(SpecRenderer, {
              spec: renderSpec.value,
              state: store,
              catalog,
              components: options.components,
              streaming: streaming.value,
              handlers,
              ...(options.onAction ? { onAction: options.onAction } : {}),
              ...(options.placeholder
                ? { placeholder: options.placeholder }
                : {}),
            }),
          ]);
      },
    });

  const entries: WidgetToolkitExtension["entries"] = (context) => ({
    render_spec: toolkitEntry(
      tools.render_spec,
      renderSpec(context.execution === "frontend") as never,
      context,
      execute,
    ),
  });
  return {
    tools,
    modules: specModules(catalog, options.specPrompt),
    entries: (context) => entries(context) as Toolkit,
  };
}
