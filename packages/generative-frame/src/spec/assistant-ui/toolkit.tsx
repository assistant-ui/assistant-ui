import {
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { toolkitEntry } from "../../assistant-ui/entry";
import type { WidgetToolkitExtension } from "../../assistant-ui/extension";
import { createSnapshotSaver } from "../../assistant-ui/snapshotSaver";
import { toolCalls, type MessageLike } from "../../assistant-ui/tool-calls";
import type { ActionHandler } from "../actions";
import type { Catalog } from "../catalog";
import type { SpecPromptOptions } from "../prompt";
import type {
  SpecComponents,
  SpecPlaceholderProps,
  SpecRendererProps,
} from "../react/SpecRenderer";
import { useSpecStream } from "../react/useSpecStream";
import {
  createSpecTools,
  specGuidanceModule,
  type RenderSpecInput,
} from "../render-spec";
import {
  createStateStore,
  type SpecStateStore,
  type SpecStateWrite,
} from "../state";
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

/** The interactions a host records on a tool call, as its `unstable_interactions` prop holds them. */
type InteractionLog = {
  readonly entries: readonly (
    | {
        readonly type: "action";
        readonly payload: Readonly<Record<string, unknown>>;
      }
    | { readonly type: "human-response"; readonly payload: unknown }
  )[];
};

/**
 * The state writes saved on a `render_spec` call: the newest `setState` interaction recorded for that call. An entry whose `writes` is not a list marks a save that failed, so the call starts from the model's state rather than from an older snapshot.
 */
function savedWrites(
  log: InteractionLog | undefined,
  toolCallId: string,
): SpecStateWrite[] {
  const entries = log?.entries ?? [];
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index]!;
    if (
      entry.type !== "action" ||
      entry.payload["type"] !== "setState" ||
      entry.payload["toolCallId"] !== toolCallId
    )
      continue;
    const writes = entry.payload["writes"];
    if (!Array.isArray(writes)) return [];
    return writes.flatMap((write): SpecStateWrite[] => {
      if (
        !Array.isArray(write) ||
        typeof write[0] !== "string" ||
        (write.length !== 2 && write.length !== 3 && write.length !== 4)
      ) {
        return [];
      }
      if (write.length === 2) return [[write[0], write[1]]];
      if (typeof write[2] !== "string") return [];
      const mode = write[2] === "replace" ? "replace" : "add";
      if (write.length === 3) return [[write[0], write[1], mode]];
      if (
        !Array.isArray(write[3]) ||
        !write[3].every((path) => typeof path === "string")
      ) {
        return [];
      }
      return [[write[0], write[1], mode, write[3]]];
    });
  }
  return [];
}

const WIDGET_TOOLS = new Set([
  "read_me",
  "show_widget",
  "edit_widget",
  "preview_widget",
  "render_spec",
]);

/** Results of the tool calls before this one, by tool name and newest first, leaving out the widget toolkit's own tools. Tool names are keys every model can see, unlike call ids, which some formats never show, and counting back from this call keeps an index stable when a host prunes older history. */
function resolveToolResults(
  messages: readonly MessageLike[],
  toolCallId: string,
): Record<string, unknown[]> {
  const results: Record<string, unknown[]> = Object.create(null);
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) break;
    if (WIDGET_TOOLS.has(call.name)) continue;
    (results[call.name] ??= []).unshift(decodeResult(call.result));
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

function priorSpecCalls(
  messages: readonly MessageLike[],
  toolCallId: string,
  title: string,
): number {
  let count = 0;
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) break;
    if (call.name === "render_spec" && call.args["title"] === title) count++;
  }
  return count;
}

type SpecHistory = (title: string) => {
  spec: Spec | undefined;
  version: number;
};

/** What `createSpecToolkit` takes from the platform it runs on. */
export type SpecToolkitPlatform = {
  /** The thread's messages, read with the host's `useAuiState`. */
  useMessages(): readonly MessageLike[];
  /** Whether the tool call's arguments have fully arrived, read with the host's `useToolArgsStatus`. */
  useArgsComplete(): boolean;
  SpecRenderer: ComponentType<SpecRendererProps>;
  /** Wraps each call's rendered spec. */
  Frame: ComponentType<{ title: string; children: ReactNode }>;
};

type RenderSpecProps = {
  args: SpecArgs;
  toolCallId: string;
  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  unstable_interactions?: InteractionLog | undefined;
  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  unstable_recordInteraction?:
    | ((input: { type: "action"; payload: unknown }) => Promise<void>)
    | undefined;
};

export const specToolkitFor =
  ({
    useMessages,
    useArgsComplete,
    SpecRenderer,
    Frame,
  }: SpecToolkitPlatform) =>
  (catalog: Catalog, options: SpecToolkitOptions): WidgetToolkitExtension => {
    const specs = new Map<string, { spec: Spec; version: number }>();
    const tools = createSpecTools(catalog, { specs });
    // Each mounted call registers what its own thread held before it, so `execute` patches that base even after a reload or in another thread.
    const histories = new Map<string, SpecHistory>();

    const execute = (input: RenderSpecInput, call: { toolCallId: string }) => {
      const history = histories.get(call.toolCallId);
      if (history) {
        const { spec, version } = history(input.title);
        if (spec) specs.set(input.title, { spec, version });
        else specs.delete(input.title);
      }
      return tools.render_spec.execute(input);
    };

    const renderSpecUI = (mountsToolResults: boolean) =>
      function RenderSpecUI({
        args,
        toolCallId,
        unstable_interactions,
        unstable_recordInteraction,
      }: RenderSpecProps) {
        const streaming = !useArgsComplete();
        const messages = useMessages();
        const title = typeof args.title === "string" ? args.title : "";
        // The base and the tool results only depend on earlier calls, so they are read once per call.
        const [base] = useState(() =>
          resolveSpecBase(messages, toolCallId, title),
        );
        const [toolResults] = useState(() =>
          mountsToolResults
            ? resolveToolResults(messages, toolCallId)
            : undefined,
        );
        const [history] = useState<SpecHistory>(() => (callTitle: string) => ({
          spec: resolveSpecBase(messages, toolCallId, callTitle),
          version: priorSpecCalls(messages, toolCallId, callTitle),
        }));
        useInsertionEffect(() => {
          histories.set(toolCallId, history);
          return () => {
            if (histories.get(toolCallId) === history)
              histories.delete(toolCallId);
          };
        }, [toolCallId, history]);
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
          () =>
            toolResults && spec.state?.["tools"] === undefined
              ? { ...spec.state, tools: toolResults }
              : undefined,
          [spec.state, toolResults],
        );
        const renderSpec = useMemo(
          () => (renderState ? { ...spec, state: renderState } : spec),
          [spec, renderState],
        );
        const [store] = useState(() =>
          createStateStore(renderSpec.state ?? {}, {
            writes: savedWrites(unstable_interactions, toolCallId),
          }),
        );
        useEffect(() => {
          if (renderSpec.state) store.seed(renderSpec.state);
        }, [store, renderSpec.state]);
        const record = useRef(unstable_recordInteraction);
        useInsertionEffect(() => {
          record.current = unstable_recordInteraction;
        });
        const [saver] = useState(() =>
          createSnapshotSaver(store.writes(), (writes) =>
            record.current?.({
              type: "action",
              payload: { type: "setState", toolCallId, writes },
            }),
          ),
        );
        useEffect(() => {
          const unsubscribe = store.subscribe(() =>
            saver.schedule(() => store.writes()),
          );
          return () => {
            unsubscribe();
            saver.flush();
          };
        }, [store, saver]);

        return (
          <Frame title={title}>
            <SpecRenderer
              spec={renderSpec}
              state={store}
              catalog={catalog}
              components={options.components}
              streaming={streaming}
              {...(options.handlers ? { handlers: options.handlers } : {})}
              {...(options.onAction ? { onAction: options.onAction } : {})}
              {...(options.placeholder
                ? { placeholder: options.placeholder }
                : {})}
            />
          </Frame>
        );
      };

    return {
      tools,
      modules: [
        specGuidanceModule(catalog, {
          ...options.specPrompt,
          customRules: [
            ...(options.specPrompt?.customRules ?? []),
            'Results of earlier tool calls are in state under `/tools/<toolName>/<n>`, newest first: `0` is the latest call to that tool before this `render_spec` call, `1` the one before it, and so on. Show their values with `{ "$state": "/tools/<toolName>/<n>/..." }` rather than copying them, and never write `tools` in `state`. Indexes count back from each `render_spec` call, so when a patch follows another call to the same tool, update any binding that should keep showing the older result.',
          ],
        }),
      ],
      entries: (context) => ({
        render_spec: toolkitEntry(
          tools.render_spec,
          renderSpecUI(context.execution === "frontend") as never,
          context,
          execute,
        ),
      }),
    };
  };
