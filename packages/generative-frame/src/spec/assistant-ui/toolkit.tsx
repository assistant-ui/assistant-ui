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
  type ModelContextSource,
  type SharedContext,
} from "../../assistant-ui/modelContext";
import { createSnapshotSaver } from "../../assistant-ui/snapshotSaver";
import type { MessageLike } from "../../assistant-ui/tool-calls";
import { useSharedContext } from "../../assistant-ui/useSharedContext";
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
  createStateStore,
  type SpecStateStore,
  type SpecStateWrite,
} from "../state";
import type { Spec } from "../types";
import {
  callHistory,
  copyTextHandler,
  createSpecCalls,
  resolveSpecBase,
  resolveToolResults,
  savedWrites,
  specModules,
  type InteractionLog,
  type SpecArgs,
} from "./thread";

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
  /** Writes to the user's clipboard, for the `copyText` action; a platform without a clipboard leaves it out. */
  copyText?: (text: string) => Promise<void>;
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
    copyText,
  }: SpecToolkitPlatform) =>
  (catalog: Catalog, options: SpecToolkitOptions): WidgetToolkitExtension => {
    const { tools, histories, execute } = createSpecCalls(
      catalog,
      options.specPrompt,
    );

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
        const [history] = useState(() => callHistory(earlier, toolCallId));
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
            ...(copyText ? { copyText: copyTextHandler(copyText) } : {}),
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
      modules: specModules(catalog, options.specPrompt, {
        clipboard: copyText !== undefined,
      }),
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
