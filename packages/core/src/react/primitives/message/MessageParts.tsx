import {
  type ComponentType,
  type FC,
  type ReactNode,
  memo,
  type PropsWithChildren,
  useMemo,
} from "react";
import {
  RenderChildrenWithAccessor,
  useAuiState,
  useAui,
} from "@assistant-ui/store";
import type { PartState } from "../../../store/scopes/part";
import { PartByIndexProvider } from "../../providers/PartByIndexProvider";
import { TextMessagePartProvider } from "../../providers/TextMessagePartProvider";
import { ChainOfThoughtByIndicesProvider } from "../../providers/ChainOfThoughtByIndicesProvider";
import { getMessageQuote } from "../../utils/getMessageQuote";
import type {
  Unstable_AudioMessagePartComponent,
  DataMessagePartComponent,
  DataMessagePartProps,
  EmptyMessagePartComponent,
  TextMessagePartComponent,
  ImageMessagePartComponent,
  SourceMessagePartComponent,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  FileMessagePartComponent,
  ReasoningMessagePartComponent,
  ReasoningGroupComponent,
  QuoteMessagePartComponent,
} from "../../types/MessagePartComponentTypes";
import type { MessagePartStatus } from "../../../types/message";
import { useShallow } from "zustand/shallow";

type MessagePartRange =
  | { type: "single"; index: number }
  | { type: "toolGroup"; startIndex: number; endIndex: number }
  | { type: "reasoningGroup"; startIndex: number; endIndex: number }
  | { type: "chainOfThoughtGroup"; startIndex: number; endIndex: number };

/**
 * Creates a group state manager for a specific part type.
 * Returns functions to start, end, and finalize groups.
 */
const createGroupState = <
  T extends "toolGroup" | "reasoningGroup" | "chainOfThoughtGroup",
>(
  groupType: T,
) => {
  let start = -1;

  return {
    startGroup: (index: number) => {
      if (start === -1) {
        start = index;
      }
    },
    endGroup: (endIndex: number, ranges: MessagePartRange[]) => {
      if (start !== -1) {
        ranges.push({
          type: groupType,
          startIndex: start,
          endIndex,
        } as MessagePartRange);
        start = -1;
      }
    },
    finalize: (endIndex: number, ranges: MessagePartRange[]) => {
      if (start !== -1) {
        ranges.push({
          type: groupType,
          startIndex: start,
          endIndex,
        } as MessagePartRange);
      }
    },
  };
};

/**
 * Groups consecutive tool-call and reasoning message parts into ranges.
 * Always groups tool calls and reasoning parts, even if there's only one.
 * When useChainOfThought is true, groups tool-call and reasoning parts together.
 */
const groupMessageParts = (
  messageTypes: readonly string[],
  useChainOfThought: boolean,
): MessagePartRange[] => {
  const ranges: MessagePartRange[] = [];

  if (useChainOfThought) {
    const chainOfThoughtGroup = createGroupState("chainOfThoughtGroup");

    for (let i = 0; i < messageTypes.length; i++) {
      const type = messageTypes[i];

      if (type === "tool-call" || type === "reasoning") {
        chainOfThoughtGroup.startGroup(i);
      } else {
        chainOfThoughtGroup.endGroup(i - 1, ranges);
        ranges.push({ type: "single", index: i });
      }
    }

    chainOfThoughtGroup.finalize(messageTypes.length - 1, ranges);
  } else {
    const toolGroup = createGroupState("toolGroup");
    const reasoningGroup = createGroupState("reasoningGroup");

    for (let i = 0; i < messageTypes.length; i++) {
      const type = messageTypes[i];

      if (type === "tool-call") {
        reasoningGroup.endGroup(i - 1, ranges);
        toolGroup.startGroup(i);
      } else if (type === "reasoning") {
        toolGroup.endGroup(i - 1, ranges);
        reasoningGroup.startGroup(i);
      } else {
        toolGroup.endGroup(i - 1, ranges);
        reasoningGroup.endGroup(i - 1, ranges);
        ranges.push({ type: "single", index: i });
      }
    }

    toolGroup.finalize(messageTypes.length - 1, ranges);
    reasoningGroup.finalize(messageTypes.length - 1, ranges);
  }

  return ranges;
};

const useMessagePartsGroups = (
  useChainOfThought: boolean,
): MessagePartRange[] => {
  const messageTypes = useAuiState(
    useShallow((s) => s.message.parts.map((c: any) => c.type)),
  );

  return useMemo(() => {
    if (messageTypes.length === 0) {
      return [];
    }
    return groupMessageParts(messageTypes, useChainOfThought);
  }, [messageTypes, useChainOfThought]);
};

export namespace MessagePrimitiveParts {
  type DataConfig = {
    /** Map data event names to specific components */
    by_name?: Record<string, DataMessagePartComponent | undefined> | undefined;
    /** Fallback component for unmatched data events */
    Fallback?: DataMessagePartComponent | undefined;
  };

  type BaseComponents = {
    /** Component for rendering empty messages */
    Empty?: EmptyMessagePartComponent | undefined;
    /** Component for rendering text content */
    Text?: TextMessagePartComponent | undefined;
    /** Component for rendering source content */
    Source?: SourceMessagePartComponent | undefined;
    /** Component for rendering image content */
    Image?: ImageMessagePartComponent | undefined;
    /** Component for rendering file content */
    File?: FileMessagePartComponent | undefined;
    /** Component for rendering audio content (experimental) */
    Unstable_Audio?: Unstable_AudioMessagePartComponent | undefined;
    /** Configuration for data part rendering */
    data?: DataConfig | undefined;
    /** Component for rendering a quoted message reference (from metadata, not parts) */
    Quote?: QuoteMessagePartComponent | undefined;
  };

  type ToolsConfig =
    | {
        /** Map of tool names to their specific components */
        by_name?:
          | Record<string, ToolCallMessagePartComponent | undefined>
          | undefined;
        /** Fallback component for unregistered tools */
        Fallback?: ComponentType<ToolCallMessagePartProps> | undefined;
      }
    | {
        /** Override component that handles all tool calls */
        Override: ComponentType<ToolCallMessagePartProps>;
      };

  /**
   * Standard component configuration for rendering reasoning and tool-call parts
   * individually (with optional grouping).
   *
   * Cannot be combined with `ChainOfThought`.
   */
  type StandardComponents = BaseComponents & {
    /** Component for rendering reasoning content (typically hidden) */
    Reasoning?: ReasoningMessagePartComponent | undefined;
    /** Configuration for tool call rendering */
    tools?: ToolsConfig | undefined;

    /**
     * Component for rendering grouped consecutive tool calls.
     *
     * @param startIndex - Index of the first tool call in the group
     * @param endIndex - Index of the last tool call in the group
     * @param children - Rendered tool call components to display within the group
     *
     * @deprecated This feature is still experimental and subject to change.
     */
    ToolGroup?: ComponentType<
      PropsWithChildren<{ startIndex: number; endIndex: number }>
    >;

    /**
     * Component for rendering grouped reasoning parts.
     *
     * @param startIndex - Index of the first reasoning part in the group
     * @param endIndex - Index of the last reasoning part in the group
     * @param children - Rendered reasoning part components
     */
    ReasoningGroup?: ReasoningGroupComponent;

    ChainOfThought?: never;
  };

  /**
   * Chain of thought component configuration.
   *
   * When `ChainOfThought` is set, it takes control of rendering ALL reasoning and
   * tool-call parts in the message. The `Reasoning`, `tools`, `ReasoningGroup`, and
   * `ToolGroup` components cannot be used alongside it.
   */
  type ChainOfThoughtComponents = BaseComponents & {
    ChainOfThought: ComponentType;

    Reasoning?: never;
    tools?: never;
    ToolGroup?: never;
    ReasoningGroup?: never;
  };

  export type Props =
    | {
        /**
         * Component configuration for rendering different types of message content.
         *
         * Use either `Reasoning`/`tools`/`ToolGroup`/`ReasoningGroup` for standard rendering,
         * or `ChainOfThought` to group all reasoning and tool-call parts into a single
         * collapsible component. These two modes are mutually exclusive.
         */
        components?: StandardComponents | ChainOfThoughtComponents | undefined;
        /**
         * When enabled, shows the Empty component if the last part in the message
         * is anything other than Text or Reasoning.
         *
         * @experimental This API is experimental and may change in future versions.
         * @default true
         */
        unstable_showEmptyOnNonTextEnd?: boolean | undefined;
        children?: never;
      }
    | {
        /** Render function called for each part. Receives the enriched part state. */
        children: (value: { part: EnrichedPartState }) => ReactNode;
        components?: never;
        unstable_showEmptyOnNonTextEnd?: never;
      };
}

const ToolUIDisplay = ({
  Fallback,
  ...props
}: {
  Fallback: ToolCallMessagePartComponent | undefined;
} & ToolCallMessagePartProps) => {
  const Render = useAuiState((s) => {
    const Render = s.tools.tools[props.toolName] ?? Fallback;
    if (Array.isArray(Render)) return Render[0] ?? Fallback;
    return Render;
  });
  if (!Render) return null;
  return <Render {...props} />;
};

const DataUIDisplay = ({
  Fallback,
  ...props
}: {
  Fallback: DataMessagePartComponent | undefined;
} & DataMessagePartProps) => {
  const Render = useAuiState((s) => {
    const Render = s.dataRenderers.renderers[props.name] ?? Fallback;
    if (Array.isArray(Render)) return Render[0] ?? Fallback;
    return Render;
  });
  if (!Render) return null;
  return <Render {...props} />;
};

/**
 * Platform-agnostic no-op default components.
 * Each platform (web, RN) wraps MessagePrimitiveParts with its own defaults.
 */
export const defaultComponents = {
  Text: () => null,
  Reasoning: () => null,
  Source: () => null,
  Image: () => null,
  File: () => null,
  Unstable_Audio: () => null,
  ToolGroup: ({ children }: PropsWithChildren) => children,
  ReasoningGroup: ({ children }: PropsWithChildren) => children,
} satisfies MessagePrimitiveParts.Props["components"];

type MessagePartComponentProps = {
  components: MessagePrimitiveParts.Props["components"];
};

export const MessagePartComponent: FC<MessagePartComponentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Reasoning = defaultComponents.Reasoning,
    Image = defaultComponents.Image,
    Source = defaultComponents.Source,
    File = defaultComponents.File,
    Unstable_Audio: Audio = defaultComponents.Unstable_Audio,
    tools = {},
    data,
  } = {},
}) => {
  const aui = useAui();
  const part = useAuiState((s) => s.part);

  const type = part.type;
  if (type === "tool-call") {
    const addResult = aui.part().addToolResult;
    const resume = aui.part().resumeToolCall;
    if ("Override" in tools)
      return <tools.Override {...part} addResult={addResult} resume={resume} />;
    const Tool = tools.by_name?.[part.toolName] ?? tools.Fallback;
    return (
      <ToolUIDisplay
        {...part}
        Fallback={Tool}
        addResult={addResult}
        resume={resume}
      />
    );
  }

  if (part.status?.type === "requires-action")
    throw new Error("Encountered unexpected requires-action status");

  switch (type) {
    case "text":
      return <Text {...part} />;

    case "reasoning":
      return <Reasoning {...part} />;

    case "source":
      return <Source {...part} />;

    case "image":
      return <Image {...part} />;

    case "file":
      return <File {...part} />;

    case "audio":
      return <Audio {...part} />;

    case "data": {
      const Data = data?.by_name?.[part.name] ?? data?.Fallback;
      return <DataUIDisplay {...part} Fallback={Data} />;
    }

    default:
      console.warn(`Unknown message part type: ${type}`);
      return null;
  }
};

export namespace MessagePrimitivePartByIndex {
  export type Props = {
    index: number;
    components: MessagePrimitiveParts.Props["components"];
  };
}

/**
 * Renders a single message part at the specified index.
 */
export const MessagePrimitivePartByIndex: FC<MessagePrimitivePartByIndex.Props> =
  memo(
    ({ index, components }) => {
      return (
        <PartByIndexProvider index={index}>
          <MessagePartComponent components={components} />
        </PartByIndexProvider>
      );
    },
    (prev, next) =>
      prev.index === next.index &&
      prev.components?.Text === next.components?.Text &&
      prev.components?.Reasoning === next.components?.Reasoning &&
      prev.components?.Source === next.components?.Source &&
      prev.components?.Image === next.components?.Image &&
      prev.components?.File === next.components?.File &&
      prev.components?.Unstable_Audio === next.components?.Unstable_Audio &&
      prev.components?.tools === next.components?.tools &&
      prev.components?.data === next.components?.data &&
      prev.components?.ToolGroup === next.components?.ToolGroup &&
      prev.components?.ReasoningGroup === next.components?.ReasoningGroup,
  );

MessagePrimitivePartByIndex.displayName = "MessagePrimitive.PartByIndex";

const EmptyPartFallback: FC<{
  status: MessagePartStatus;
  component: TextMessagePartComponent;
}> = ({ status, component: Component }) => {
  return (
    <TextMessagePartProvider text="" isRunning={status.type === "running"}>
      <Component type="text" text="" status={status} />
    </TextMessagePartProvider>
  );
};

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});

const EmptyPartsImpl: FC<MessagePartComponentProps> = ({ components }) => {
  const status = useAuiState(
    (s) => (s.message.status ?? COMPLETE_STATUS) as MessagePartStatus,
  );

  if (components?.Empty) return <components.Empty status={status} />;

  if (status.type !== "running") return null;

  return (
    <EmptyPartFallback
      status={status}
      component={components?.Text ?? defaultComponents.Text}
    />
  );
};

const EmptyParts = memo(
  EmptyPartsImpl,
  (prev, next) =>
    prev.components?.Empty === next.components?.Empty &&
    prev.components?.Text === next.components?.Text,
);

const ConditionalEmptyImpl: FC<{
  components: MessagePrimitiveParts.Props["components"];
  enabled: boolean;
}> = ({ components, enabled }) => {
  const shouldShowEmpty = useAuiState((s) => {
    if (!enabled) return false;
    if (s.message.parts.length === 0) return false;

    const lastPart = s.message.parts[s.message.parts.length - 1];
    return lastPart?.type !== "text" && lastPart?.type !== "reasoning";
  });

  if (!shouldShowEmpty) return null;
  return <EmptyParts components={components} />;
};

const ConditionalEmpty = memo(
  ConditionalEmptyImpl,
  (prev, next) =>
    prev.enabled === next.enabled &&
    prev.components?.Empty === next.components?.Empty &&
    prev.components?.Text === next.components?.Text,
);

const QuoteRendererImpl: FC<{ Quote: QuoteMessagePartComponent }> = ({
  Quote,
}) => {
  const quoteInfo = useAuiState(getMessageQuote);
  if (!quoteInfo) return null;
  return <Quote text={quoteInfo.text} messageId={quoteInfo.messageId} />;
};

const QuoteRenderer = memo(QuoteRendererImpl);

/**
 * Stable propless component that renders the registered tool UI for the
 * current part context. Reads tool registry and part state from context.
 */
const RegisteredToolUI: FC = () => {
  const aui = useAui();
  const part = useAuiState((s) => s.part);
  const Render = useAuiState((s) => {
    if (s.part.type !== "tool-call") return null;
    const entry = s.tools.tools[s.part.toolName];
    if (Array.isArray(entry)) return entry[0] ?? null;
    return entry ?? null;
  });

  if (!Render || part.type !== "tool-call") return null;

  return (
    <Render
      {...part}
      addResult={aui.part().addToolResult}
      resume={aui.part().resumeToolCall}
    />
  );
};

/**
 * Stable propless component that renders the registered data renderer UI
 * for the current part context.
 */
const RegisteredDataRendererUI: FC = () => {
  const part = useAuiState((s) => s.part);
  const Render = useAuiState((s) => {
    if (s.part.type !== "data") return null;
    const entry = s.dataRenderers.renderers[s.part.name];
    if (Array.isArray(entry)) return entry[0] ?? null;
    return entry ?? null;
  });

  if (!Render || part.type !== "data") return null;

  return <Render {...(part as DataMessagePartProps)} />;
};

/**
 * Fallback component rendered when the children render function returns null.
 * Renders registered tool/data UIs via context.
 * For all other part types, renders nothing.
 *
 * This allows users to write:
 *   {({ part }) => {
 *     if (part.type === "text") return <MyText />;
 *     return null; // tool UIs and data UIs still render via registry
 *   }}
 *
 * To explicitly render nothing (suppressing registered UIs), return <></>.
 */
const DefaultPartFallback: FC = () => {
  const partType = useAuiState((s) => s.part.type);

  if (partType === "tool-call") return <RegisteredToolUI />;
  if (partType === "data") return <RegisteredDataRendererUI />;

  return null;
};

export type { PartState };

/**
 * Enriched part state passed to children render functions.
 *
 * For tool-call parts, adds `toolUI`, `addResult`, and `resume`.
 * For data parts, adds `dataRendererUI`.
 */
export type EnrichedPartState =
  | (Extract<PartState, { type: "tool-call" }> & {
      /** The registered tool UI element, or null if none registered. */
      readonly toolUI: ReactNode;
      /** Add a tool result to this tool call. */
      addResult: ToolCallMessagePartProps["addResult"];
      /** Resume a tool call waiting for human input. */
      resume: ToolCallMessagePartProps["resume"];
    })
  | (Extract<PartState, { type: "data" }> & {
      /** The registered data renderer UI element, or null if none registered. */
      readonly dataRendererUI: ReactNode;
    })
  | Exclude<PartState, { type: "tool-call" } | { type: "data" }>;

const MessagePrimitivePartsInner: FC<{
  children: (value: { part: EnrichedPartState }) => ReactNode;
}> = ({ children }) => {
  const aui = useAui();
  const contentLength = useAuiState((s) => s.message.parts.length);

  // biome-ignore lint/correctness/useExhaustiveDependencies: aui accessors are stable refs
  return useMemo(
    () =>
      Array.from({ length: contentLength }, (_, index) => (
        <PartByIndexProvider key={index} index={index}>
          <RenderChildrenWithAccessor
            getItemState={(aui) => aui.message().part({ index }).getState()}
          >
            {(getItem) => {
              const result = children({
                get part() {
                  const state = getItem();
                  if (state.type === "tool-call") {
                    const entry = aui.tools().getState().tools[state.toolName];
                    const hasUI = Array.isArray(entry) ? !!entry[0] : !!entry;
                    const partMethods = aui.message().part({ index });
                    return {
                      ...state,
                      toolUI: hasUI ? <RegisteredToolUI /> : null,
                      addResult: partMethods.addToolResult,
                      resume: partMethods.resumeToolCall,
                    };
                  }
                  if (state.type === "data") {
                    const entry = aui.dataRenderers().getState().renderers[
                      state.name
                    ];
                    const hasUI = Array.isArray(entry) ? !!entry[0] : !!entry;
                    return {
                      ...state,
                      dataRendererUI: hasUI ? (
                        <RegisteredDataRendererUI />
                      ) : null,
                    };
                  }
                  return state;
                },
              });
              if (result !== null) return result;
              return <DefaultPartFallback />;
            }}
          </RenderChildrenWithAccessor>
        </PartByIndexProvider>
      )),
    [contentLength, children],
  );
};

/**
 * Renders the parts of a message with support for multiple content types.
 *
 * This is the platform-agnostic base. Each platform wraps this with its own
 * default components (web uses `<p>`, `<span>`; RN would use `<Text>`, etc.).
 */
export const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props> = ({
  components,
  unstable_showEmptyOnNonTextEnd = true,
  children,
}) => {
  if (children) {
    return <MessagePrimitivePartsInner>{children}</MessagePrimitivePartsInner>;
  }
  return (
    <MessagePrimitivePartsCompat
      components={components}
      unstable_showEmptyOnNonTextEnd={unstable_showEmptyOnNonTextEnd}
    />
  );
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";

const MessagePrimitivePartsCompat: FC<{
  components: MessagePrimitiveParts.Props["components"];
  unstable_showEmptyOnNonTextEnd: boolean;
}> = ({ components, unstable_showEmptyOnNonTextEnd }) => {
  const contentLength = useAuiState((s) => s.message.parts.length);
  const useChainOfThought = !!components?.ChainOfThought;
  const messageRanges = useMessagePartsGroups(useChainOfThought);

  const partsElements = useMemo(() => {
    if (contentLength === 0) {
      return <EmptyParts components={components} />;
    }

    return messageRanges.map((range) => {
      if (range.type === "single") {
        return (
          <MessagePrimitivePartByIndex
            key={range.index}
            index={range.index}
            components={components}
          />
        );
      } else if (range.type === "chainOfThoughtGroup") {
        const ChainOfThoughtComponent = components?.ChainOfThought;
        if (!ChainOfThoughtComponent) return null;
        return (
          <ChainOfThoughtByIndicesProvider
            key={`chainOfThought-${range.startIndex}`}
            startIndex={range.startIndex}
            endIndex={range.endIndex}
          >
            <ChainOfThoughtComponent />
          </ChainOfThoughtByIndicesProvider>
        );
      } else if (range.type === "toolGroup") {
        const ToolGroupComponent =
          components?.ToolGroup ?? defaultComponents.ToolGroup;
        return (
          <ToolGroupComponent
            key={`tool-${range.startIndex}`}
            startIndex={range.startIndex}
            endIndex={range.endIndex}
          >
            {Array.from(
              { length: range.endIndex - range.startIndex + 1 },
              (_, i) => (
                <MessagePrimitivePartByIndex
                  key={i}
                  index={range.startIndex + i}
                  components={components}
                />
              ),
            )}
          </ToolGroupComponent>
        );
      } else {
        // reasoningGroup
        const ReasoningGroupComponent =
          components?.ReasoningGroup ?? defaultComponents.ReasoningGroup;
        return (
          <ReasoningGroupComponent
            key={`reasoning-${range.startIndex}`}
            startIndex={range.startIndex}
            endIndex={range.endIndex}
          >
            {Array.from(
              { length: range.endIndex - range.startIndex + 1 },
              (_, i) => (
                <MessagePrimitivePartByIndex
                  key={i}
                  index={range.startIndex + i}
                  components={components}
                />
              ),
            )}
          </ReasoningGroupComponent>
        );
      }
    });
  }, [messageRanges, components, contentLength]);

  return (
    <>
      {components?.Quote && <QuoteRenderer Quote={components.Quote} />}
      {partsElements}
      <ConditionalEmpty
        components={components}
        enabled={unstable_showEmptyOnNonTextEnd}
      />
    </>
  );
};
