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
import {
  savedContext,
  toSharedContext,
  useSharedContext,
  type ModelContextSource,
  type SharedContext,
} from "../../assistant-ui/modelContext";
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
    return writes.filter(
      (write): write is SpecStateWrite =>
        Array.isArray(write) &&
        write.length === 2 &&
        typeof write[0] === "string",
    );
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
  /** Appends a user message to the thread, for the `sendMessage` action. */
  useSendMessage(): (text: string) => void;
  /** Registers what `updateModelContext` shares as model context, read when each request starts. */
  useModelContext(source: ModelContextSource): void;
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
    useSendMessage,
    useModelContext,
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
        // Earlier calls do not change, so the thread is read once per call; the base follows the title, which may still be streaming when the call mounts.
        const [earlier] = useState(messages);
        const base = useMemo(
          () => resolveSpecBase(earlier, toolCallId, title),
          [earlier, toolCallId, title],
        );
        const [toolResults] = useState(() =>
          mountsToolResults
            ? resolveToolResults(earlier, toolCallId)
            : undefined,
        );
        const [history] = useState<SpecHistory>(() => (callTitle: string) => ({
          spec: resolveSpecBase(earlier, toolCallId, callTitle),
          version: priorSpecCalls(earlier, toolCallId, callTitle),
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
        // A stream reads its base when it starts, so it starts over when the title brings a new one.
        const resetStream = streamed.reset;
        const streamBase = useRef(base);
        useEffect(() => {
          if (streamBase.current === base) return;
          streamBase.current = base;
          resetStream();
        }, [base, resetStream]);
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
        const [initialContext] = useState(() =>
          savedContext(unstable_interactions, toolCallId, "setState"),
        );
        const context = useRef(initialContext);
        const [snapshot] = useState(() => () => ({
          writes: store.writes(),
          ...(context.current ? { context: context.current } : {}),
        }));
        const [saver] = useState(() =>
          createSnapshotSaver<{
            writes: readonly SpecStateWrite[];
            context?: SharedContext;
          }>(snapshot(), (saved) =>
            record.current?.({
              type: "action",
              payload: {
                type: "setState",
                toolCallId,
                writes: saved?.writes ?? null,
                ...(saved?.context ? { context: saved.context } : {}),
              },
            }),
          ),
        );
        const sendMessage = useSendMessage();
        const share = useSharedContext({
          title,
          toolCallId,
          initial: options.handlers?.["updateModelContext"]
            ? undefined
            : initialContext,
          useModelContext,
          onShare: (next) => {
            context.current = next;
            saver.schedule(snapshot);
          },
        });
        const handlers = useMemo(
          () => ({
            sendMessage: (
              params: Record<string, unknown>,
              source: { kind?: string },
            ) => {
              const text = params["text"];
              if (source.kind === "watch") return;
              if (typeof text === "string" && text.trim()) sendMessage(text);
            },
            updateModelContext: (params: Record<string, unknown>) =>
              share(toSharedContext(params["text"], params["data"])),
            ...options.handlers,
          }),
          [sendMessage, share],
        );
        useEffect(() => {
          const unsubscribe = store.subscribe(() => saver.schedule(snapshot));
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
              handlers={handlers}
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
          hostApi: {
            prompt: true,
            modelContext: true,
            ...options.specPrompt?.hostApi,
          },
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
