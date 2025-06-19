"use client";

import { type ComponentType, type FC, memo, useMemo } from "react";
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
    prev.components?.tools === next.components?.tools,
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

  const contentElements = useMemo(() => {
    if (contentLength === 0) {
      return <EmptyContent components={components} />;
    }
    return Array.from({ length: contentLength }, (_, index) => (
      <MessageContentPart
        key={index}
        partIndex={index}
        components={components}
      />
    ));
  }, [contentLength, components]);

  return <>{contentElements}</>;
};

MessagePrimitiveContent.displayName = "MessagePrimitive.Content";
