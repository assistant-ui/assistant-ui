"use client";

import {
  type ComponentType,
  type FC,
  memo,
  PropsWithChildren,
  useMemo,
} from "react";
import { useAuiState, useAui } from "@assistant-ui/store";
import {
  PartByIndexProvider,
  TextMessagePartProvider,
} from "../../context/providers";
import { ChainOfThoughtByIndicesProvider } from "../../context/providers/ChainOfThoughtByIndicesProvider";
import { MessagePartPrimitiveText } from "../messagePart/MessagePartText";
import { MessagePartPrimitiveImage } from "../messagePart/MessagePartImage";
import type {
  Unstable_AudioMessagePartComponent,
  EmptyMessagePartComponent,
  TextMessagePartComponent,
  ImageMessagePartComponent,
  SourceMessagePartComponent,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  FileMessagePartComponent,
  ReasoningMessagePartComponent,
  ReasoningGroupComponent,
} from "../../types/MessagePartComponentTypes";
import { MessagePartPrimitiveInProgress } from "../messagePart/MessagePartInProgress";
import { MessagePartStatus } from "../../types/AssistantTypes";
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
     * When provided, this component will automatically wrap consecutive tool-call
     * message parts, allowing you to create collapsible sections, custom styling,
     * or other grouped presentations for multiple tool calls.
     *
     * The component receives:
     * - `startIndex`: The index of the first tool call in the group
     * - `endIndex`: The index of the last tool call in the group
     * - `children`: The rendered tool call components
     *
     * @example
     * ```tsx
     * // Collapsible tool group
     * ToolGroup: ({ startIndex, endIndex, children }) => (
     *   <details className="tool-group">
     *     <summary>
     *       {endIndex - startIndex + 1} tool calls
     *     </summary>
     *     <div className="tool-group-content">
     *       {children}
     *     </div>
     *   </details>
     * )
     * ```
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
     * When provided, this component will automatically wrap reasoning message parts
     * (one or more consecutive) in a group container. Each reasoning part inside
     * renders its own text independently - no text merging occurs.
     *
     * The component receives:
     * - `startIndex`: The index of the first reasoning part in the group
     * - `endIndex`: The index of the last reasoning part in the group
     * - `children`: The rendered Reasoning components (one per part)
     *
     * @example
     * ```tsx
     * // Collapsible reasoning group
     * ReasoningGroup: ({ children }) => (
     *   <details className="reasoning-group">
     *     <summary>Reasoning</summary>
     *     <div className="reasoning-content">
     *       {children}
     *     </div>
     *   </details>
     * )
     * ```
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
   *
   * The component is automatically wrapped in a ChainOfThoughtByIndicesProvider
   * that sets up the chainOfThought client scope with the correct parts.
   *
   * @example
   * ```tsx
   * // Chain of thought with accordion
   * ChainOfThought: () => (
   *   <ChainOfThoughtPrimitive.Root>
   *     <ChainOfThoughtPrimitive.AccordionTrigger>
   *       Toggle reasoning
   *     </ChainOfThoughtPrimitive.AccordionTrigger>
   *     <ChainOfThoughtPrimitive.Parts />
   *   </ChainOfThoughtPrimitive.Root>
   * )
   * ```
   */
  type ChainOfThoughtComponents = BaseComponents & {
    ChainOfThought: ComponentType;

    Reasoning?: never;
    tools?: never;
    ToolGroup?: never;
    ReasoningGroup?: never;
  };

  export type Props = {
    /**
     * Component configuration for rendering different types of message content.
     *
     * You can provide custom components for each content type (text, image, file, etc.)
     * and configure tool rendering behavior. If not provided, default components will be used.
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
     * This can be useful to ensure there's always a visible element at the end
     * of messages that end with non-text content like tool calls or images.
     *
     * @experimental This API is experimental and may change in future versions.
     * @default true
     */
    unstable_showEmptyOnNonTextEnd?: boolean | undefined;
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

const defaultComponents = {
  Text: () => (
    <p style={{ whiteSpace: "pre-line" }}>
      <MessagePartPrimitiveText />
      <MessagePartPrimitiveInProgress>
        <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
      </MessagePartPrimitiveInProgress>
    </p>
  ),
  Reasoning: () => null,
  Source: () => null,
  Image: () => <MessagePartPrimitiveImage />,
  File: () => null,
  Unstable_Audio: () => null,
  ToolGroup: ({ children }) => children,
  ReasoningGroup: ({ children }) => children,
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

    case "data":
      return null;

    default:
      const unhandledType: never = type;
      throw new Error(`Unknown message part type: ${unhandledType}`);
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
 *
 * This component provides direct access to render a specific message part
 * within the current message context, using the provided component configuration.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.PartByIndex
 *   index={0}
 *   components={{
 *     Text: MyTextComponent,
 *     Image: MyImageComponent
 *   }}
 * />
 * ```
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

/**
 * Renders the parts of a message with support for multiple content types.
 *
 * This component automatically handles different types of message content including
 * text, images, files, tool calls, and more. It provides a flexible component
 * system for customizing how each content type is rendered.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Parts
 *   components={{
 *     Text: ({ text }) => <p className="message-text">{text}</p>,
 *     Image: ({ image }) => <img src={image} alt="Message image" />,
 *     tools: {
 *       by_name: {
 *         calculator: CalculatorTool,
 *         weather: WeatherTool,
 *       },
 *       Fallback: DefaultToolComponent
 *     }
 *   }}
 * />
 * ```
 */
export const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props> = ({
  components,
  unstable_showEmptyOnNonTextEnd = true,
}) => {
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
      {partsElements}
      <ConditionalEmpty
        components={components}
        enabled={unstable_showEmptyOnNonTextEnd}
      />
    </>
  );
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";
