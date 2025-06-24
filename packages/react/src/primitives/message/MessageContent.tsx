"use client";

import {
  type ComponentType,
  type FC,
  memo,
  PropsWithChildren,
  useMemo,
} from "react";
import {
  TextContentPartProvider,
  useContentPart,
  useContentPartRuntime,
  useToolUIs,
} from "../../context";
import {
  useMessage,
  useMessageRuntime,
} from "../../context/react/MessageContext";
import { ContentPartRuntimeProvider } from "../../context/providers/ContentPartRuntimeProvider";
import { ContentPartPrimitiveText } from "../contentPart/ContentPartText";
import { ContentPartPrimitiveImage } from "../contentPart/ContentPartImage";
import type {
  Unstable_AudioContentPartComponent,
  EmptyContentPartComponent,
  TextContentPartComponent,
  ImageContentPartComponent,
  SourceContentPartComponent,
  ToolCallContentPartComponent,
  ToolCallContentPartProps,
  FileContentPartComponent,
  ReasoningContentPartComponent,
} from "../../types/ContentPartComponentTypes";
import { ContentPartPrimitiveInProgress } from "../contentPart/ContentPartInProgress";
import { ContentPartStatus } from "../../types/AssistantTypes";
import { useShallow } from "zustand/shallow";

type ContentPartRange =
  | { type: "single"; index: number }
  | { type: "toolGroup"; startIndex: number; endIndex: number };

/**
 * Groups consecutive tool-call content parts into ranges.
 * Always groups tool calls, even if there's only one.
 */
const groupContentParts = (
  contentTypes: readonly string[],
): ContentPartRange[] => {
  const ranges: ContentPartRange[] = [];
  let currentToolGroupStart = -1;

  for (let i = 0; i < contentTypes.length; i++) {
    const type = contentTypes[i];

    if (type === "tool-call") {
      // Start a new tool group if we haven't started one
      if (currentToolGroupStart === -1) {
        currentToolGroupStart = i;
      }
    } else {
      // End current tool group if it exists
      if (currentToolGroupStart !== -1) {
        ranges.push({
          type: "toolGroup",
          startIndex: currentToolGroupStart,
          endIndex: i - 1,
        });
        currentToolGroupStart = -1;
      }

      // Add non-tool-call part individually
      ranges.push({ type: "single", index: i });
    }
  }

  // Handle any remaining tool group at the end
  if (currentToolGroupStart !== -1) {
    ranges.push({
      type: "toolGroup",
      startIndex: currentToolGroupStart,
      endIndex: contentTypes.length - 1,
    });
  }

  return ranges;
};

const useMessageContentGroups = (): ContentPartRange[] => {
  const contentTypes = useMessage(
    useShallow((m) => m.content.map((c) => c.type)),
  );

  return useMemo(() => {
    if (contentTypes.length === 0) {
      return [];
    }
    return groupContentParts(contentTypes);
  }, [contentTypes]);
};

export namespace MessagePrimitiveContent {
  export type Props = {
    /**
     * Component configuration for rendering different types of message content.
     *
     * You can provide custom components for each content type (text, image, file, etc.)
     * and configure tool rendering behavior. If not provided, default components will be used.
     */
    components?:
      | {
          /** Component for rendering empty messages */
          Empty?: EmptyContentPartComponent | undefined;
          /** Component for rendering text content */
          Text?: TextContentPartComponent | undefined;
          /** Component for rendering reasoning content (typically hidden) */
          Reasoning?: ReasoningContentPartComponent | undefined;
          /** Component for rendering source content */
          Source?: SourceContentPartComponent | undefined;
          /** Component for rendering image content */
          Image?: ImageContentPartComponent | undefined;
          /** Component for rendering file content */
          File?: FileContentPartComponent | undefined;
          /** Component for rendering audio content (experimental) */
          Unstable_Audio?: Unstable_AudioContentPartComponent | undefined;
          /** Configuration for tool call rendering */
          tools?:
            | {
                /** Map of tool names to their specific components */
                by_name?:
                  | Record<string, ToolCallContentPartComponent | undefined>
                  | undefined;
                /** Fallback component for unregistered tools */
                Fallback?: ComponentType<ToolCallContentPartProps> | undefined;
              }
            | {
                /** Override component that handles all tool calls */
                Override: ComponentType<ToolCallContentPartProps>;
              }
            | undefined;

          /**
           * Component for rendering grouped consecutive tool calls.
           *
           * When provided, this component will automatically wrap consecutive tool-call
           * content parts, allowing you to create collapsible sections, custom styling,
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
           * @example
           * ```tsx
           * // Custom styled tool group with header
           * ToolGroup: ({ startIndex, endIndex, children }) => (
           *   <div className="border rounded-lg p-4 my-2">
           *     <div className="text-sm text-gray-600 mb-2">
           *       Tool execution #{startIndex + 1}-{endIndex + 1}
           *     </div>
           *     <div className="space-y-2">
           *       {children}
           *     </div>
           *   </div>
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
        }
      | undefined;
  };
}

const ToolUIDisplay = ({
  Fallback,
  ...props
}: {
  Fallback: ToolCallContentPartComponent | undefined;
} & ToolCallContentPartProps) => {
  const Render = useToolUIs((s) => s.getToolUI(props.toolName)) ?? Fallback;
  if (!Render) return null;
  return <Render {...props} />;
};

const defaultComponents = {
  Text: () => (
    <p style={{ whiteSpace: "pre-line" }}>
      <ContentPartPrimitiveText />
      <ContentPartPrimitiveInProgress>
        <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
      </ContentPartPrimitiveInProgress>
    </p>
  ),
  Reasoning: () => null,
  Source: () => null,
  Image: () => <ContentPartPrimitiveImage />,
  File: () => null,
  Unstable_Audio: () => null,
  ToolGroup: ({ children }) => children,
} satisfies MessagePrimitiveContent.Props["components"];

type MessageContentPartComponentProps = {
  components: MessagePrimitiveContent.Props["components"];
};

const MessageContentPartComponent: FC<MessageContentPartComponentProps> = ({
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
  const contentPartRuntime = useContentPartRuntime();

  const part = useContentPart();

  const type = part.type;
  if (type === "tool-call") {
    const addResult = (result: any) => contentPartRuntime.addToolResult(result);
    if ("Override" in tools)
      return <tools.Override {...part} addResult={addResult} />;
    const Tool = tools.by_name?.[part.toolName] ?? tools.Fallback;
    return <ToolUIDisplay {...part} Fallback={Tool} addResult={addResult} />;
  }

  if (part.status.type === "requires-action")
    throw new Error("Encountered unexpected requires-action status");

  switch (type) {
    case "text":
      return <Text {...part} />;

    case "reasoning":
      return <Reasoning {...part} />;

    case "source":
      return <Source {...part} />;

    case "image":
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image {...part} />;

    case "file":
      return <File {...part} />;

    case "audio":
      return <Audio {...part} />;

    default:
      const unhandledType: never = type;
      throw new Error(`Unknown content part type: ${unhandledType}`);
  }
};

type MessageContentPartProps = {
  partIndex: number;
  components: MessagePrimitiveContent.Props["components"];
};

const MessageContentPartImpl: FC<MessageContentPartProps> = ({
  partIndex,
  components,
}) => {
  const messageRuntime = useMessageRuntime();
  const runtime = useMemo(
    () => messageRuntime.getContentPartByIndex(partIndex),
    [messageRuntime, partIndex],
  );

  return (
    <ContentPartRuntimeProvider runtime={runtime}>
      <MessageContentPartComponent components={components} />
    </ContentPartRuntimeProvider>
  );
};

const MessageContentPart = memo(
  MessageContentPartImpl,
  (prev, next) =>
    prev.partIndex === next.partIndex &&
    prev.components?.Text === next.components?.Text &&
    prev.components?.Reasoning === next.components?.Reasoning &&
    prev.components?.Source === next.components?.Source &&
    prev.components?.Image === next.components?.Image &&
    prev.components?.File === next.components?.File &&
    prev.components?.Unstable_Audio === next.components?.Unstable_Audio &&
    prev.components?.tools === next.components?.tools &&
    prev.components?.ToolGroup === next.components?.ToolGroup,
);

const COMPLETE_STATUS: ContentPartStatus = Object.freeze({
  type: "complete",
});

const EmptyContentFallback: FC<{
  status: ContentPartStatus;
  component: TextContentPartComponent;
}> = ({ status, component: Component }) => {
  return (
    <TextContentPartProvider text="" isRunning={status.type === "running"}>
      <Component type="text" text="" status={status} />
    </TextContentPartProvider>
  );
};

const EmptyContentImpl: FC<MessageContentPartComponentProps> = ({
  components,
}) => {
  const status =
    useMessage((s) => s.status as ContentPartStatus) ?? COMPLETE_STATUS;

  if (components?.Empty) return <components.Empty status={status} />;

  return (
    <EmptyContentFallback
      status={status}
      component={components?.Text ?? defaultComponents.Text}
    />
  );
};

const EmptyContent = memo(
  EmptyContentImpl,
  (prev, next) =>
    prev.components?.Empty === next.components?.Empty &&
    prev.components?.Text === next.components?.Text,
);

/**
 * Renders the content of a message with support for multiple content types.
 *
 * This component automatically handles different types of message content including
 * text, images, files, tool calls, and more. It provides a flexible component
 * system for customizing how each content type is rendered.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Content
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
export const MessagePrimitiveContent: FC<MessagePrimitiveContent.Props> = ({
  components,
}) => {
  const contentLength = useMessage((s) => s.content.length);
  const contentRanges = useMessageContentGroups();

  const contentElements = useMemo(() => {
    if (contentLength === 0) {
      return <EmptyContent components={components} />;
    }

    return contentRanges.map((range) => {
      if (range.type === "single") {
        return (
          <MessageContentPart
            key={range.index}
            partIndex={range.index}
            components={components}
          />
        );
      } else {
        const ToolGroupComponent =
          components!.ToolGroup ?? defaultComponents.ToolGroup;
        return (
          <ToolGroupComponent
            key={range.startIndex}
            startIndex={range.startIndex}
            endIndex={range.endIndex}
          >
            {Array.from(
              { length: range.endIndex - range.startIndex + 1 },
              (_, i) => (
                <MessageContentPart
                  key={i}
                  partIndex={range.startIndex + i}
                  components={components}
                />
              ),
            )}
          </ToolGroupComponent>
        );
      }
    });
  }, [contentRanges, components, contentLength]);

  return <>{contentElements}</>;
};

MessagePrimitiveContent.displayName = "MessagePrimitive.Content";
