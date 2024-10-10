"use client";

import { type ComponentType, type FC, memo, useMemo } from "react";
import { useContentPart, useThreadRuntime, useToolUIs } from "../../context";
import {
  useMessage,
  useMessageRuntime,
  useMessageStore,
} from "../../context/react/MessageContext";
import { ContentPartRuntimeProvider } from "../../context/providers/ContentPartRuntimeProvider";
import { ContentPartPrimitiveText } from "../contentPart/ContentPartText";
import { ContentPartPrimitiveImage } from "../contentPart/ContentPartImage";
import { ContentPartPrimitiveDisplay } from "../contentPart/ContentPartDisplay";
import type {
  EmptyContentPartComponent,
  ImageContentPartComponent,
  TextContentPartComponent,
  ToolCallContentPartComponent,
  ToolCallContentPartProps,
  UIContentPartComponent,
} from "../../types/ContentPartComponentTypes";
import { ContentPartPrimitiveInProgress } from "../contentPart/ContentPartInProgress";
import { EMPTY_CONTENT } from "../../api/MessageRuntime";

/**
 * @deprecated Use `MessagePrimitive.Content.Props` instead. This will be removed in 0.6.
 */
export type MessagePrimitiveContentProps = MessagePrimitiveContent.Props;

export namespace MessagePrimitiveContent {
  export type Props = {
    components?:
      | {
          Empty?: EmptyContentPartComponent | undefined;
          Text?: TextContentPartComponent | undefined;
          Image?: ImageContentPartComponent | undefined;
          UI?: UIContentPartComponent | undefined;
          tools?:
            | {
                by_name?:
                  | Record<string, ToolCallContentPartComponent | undefined>
                  | undefined;
                Fallback?: ComponentType<ToolCallContentPartProps> | undefined;
              }
            | undefined;
        }
      | undefined;
  };
}

const ToolUIDisplay = ({
  UI,
  ...props
}: {
  UI: ToolCallContentPartComponent | undefined;
} & ToolCallContentPartProps) => {
  const Render = useToolUIs((s) => s.getToolUI(props.toolName)) ?? UI;
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
  Image: () => <ContentPartPrimitiveImage />,
  UI: () => <ContentPartPrimitiveDisplay />,
} satisfies MessagePrimitiveContent.Props["components"];

type MessageContentPartComponentProps = {
  components: MessagePrimitiveContent.Props["components"];
};

const MessageContentPartComponent: FC<MessageContentPartComponentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Empty,
    Image = defaultComponents.Image,
    UI = defaultComponents.UI,
    tools: { by_name = {}, Fallback = undefined } = {},
  } = {},
}) => {
  const messageStore = useMessageStore();
  const threadRuntime = useThreadRuntime();

  const part = useContentPart();

  const type = part.type;
  switch (type) {
    case "text":
      if (part.status.type === "requires-action")
        throw new Error("Encountered unexpected requires-action status");
      if (part.part === EMPTY_CONTENT && !!Empty) {
        return <Empty status={part.status} />;
      }

      return <Text {...part} part={part} />;

    case "image":
      if (part.status.type === "requires-action")
        throw new Error("Encountered unexpected requires-action status");
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image {...part} part={part} />;

    case "ui":
      if (part.status.type === "requires-action")
        throw new Error("Encountered unexpected requires-action status");
      return <UI {...part} part={part} />;

    case "tool-call": {
      const Tool = by_name[part.toolName] || Fallback;
      const addResult = (result: any) =>
        threadRuntime.addToolResult({
          messageId: messageStore.getState().id,
          toolName: part.toolName,
          toolCallId: part.toolCallId,
          result,
        });
      return (
        <ToolUIDisplay {...part} part={part} UI={Tool} addResult={addResult} />
      );
    }
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
    prev.components?.Image === next.components?.Image &&
    prev.components?.UI === next.components?.UI &&
    prev.components?.tools === next.components?.tools,
);

export const MessagePrimitiveContent: FC<MessagePrimitiveContent.Props> = ({
  components,
}) => {
  const contentLength = useMessage((s) => s.content.length) || 1;

  return Array.from({ length: contentLength }, (_, index) => (
    <MessageContentPart key={index} partIndex={index} components={components} />
  ));
};

MessagePrimitiveContent.displayName = "MessagePrimitive.Content";
