"use client";

import { type ComponentType, type FC, memo } from "react";
import {
  useAssistantContext,
  useContentPartContext,
  useThreadContext,
} from "../../context";
import { useMessageContext } from "../../context/react/MessageContext";
import {
  ContentPartProvider,
  EMPTY_CONTENT,
} from "../../context/providers/ContentPartProvider";
import { ContentPartPrimitiveText } from "../contentPart/ContentPartText";
import { ContentPartPrimitiveImage } from "../contentPart/ContentPartImage";
import { ContentPartPrimitiveDisplay } from "../contentPart/ContentPartDisplay";
import type {
  ImageContentPartComponent,
  TextContentPartComponent,
  ToolCallContentPartComponent,
  ToolCallContentPartProps,
  UIContentPartComponent,
} from "../../types/ContentPartComponentTypes";
import { ContentPartPrimitiveInProgress } from "../contentPart/ContentPartInProgress";

export type MessagePrimitiveContentProps = {
  components?:
    | {
        Empty?: TextContentPartComponent | undefined;
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

const ToolUIDisplay = ({
  UI,
  ...props
}: {
  UI: ToolCallContentPartComponent | undefined;
} & ToolCallContentPartProps) => {
  const { useToolUIs } = useAssistantContext();
  const Render = useToolUIs((s) => s.getToolUI(props.part.toolName)) ?? UI;
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
} satisfies MessagePrimitiveContentProps["components"];

type MessageContentPartComponentProps = {
  components: MessagePrimitiveContentProps["components"];
};

const MessageContentPartComponent: FC<MessageContentPartComponentProps> = ({
  components: {
    Empty = defaultComponents.Text,
    Text = defaultComponents.Text,
    Image = defaultComponents.Image,
    UI = defaultComponents.UI,
    tools: { by_name = {}, Fallback = undefined } = {},
  } = {},
}) => {
  const { useThreadActions } = useThreadContext();
  const { useMessage } = useMessageContext();
  const addToolResult = useThreadActions((t) => t.addToolResult);

  const { useContentPart } = useContentPartContext();
  const { part, status } = useContentPart();

  const type = part.type;
  switch (type) {
    case "text":
      if (status.type === "requires-action")
        throw new Error("Encountered unexpected requires-action status");
      if (part === EMPTY_CONTENT) return <Empty part={part} status={status} />;

      return <Text part={part} status={status} />;

    case "image":
      if (status.type === "requires-action")
        throw new Error("Encountered unexpected requires-action status");
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image part={part} status={status} />;

    case "ui":
      if (status.type === "requires-action")
        throw new Error("Encountered unexpected requires-action status");
      return <UI part={part} status={status} />;

    case "tool-call": {
      const Tool = by_name[part.toolName] || Fallback;
      const addResult = (result: any) =>
        addToolResult({
          messageId: useMessage.getState().message.id,
          toolName: part.toolName,
          toolCallId: part.toolCallId,
          result,
        });
      return (
        <ToolUIDisplay
          UI={Tool}
          part={part}
          status={status}
          addResult={addResult}
        />
      );
    }
    default:
      const unhandledType: never = type;
      throw new Error(`Unknown content part type: ${unhandledType}`);
  }
};

type MessageContentPartProps = {
  partIndex: number;
  components: MessagePrimitiveContentProps["components"];
};

const MessageContentPartImpl: FC<MessageContentPartProps> = ({
  partIndex,
  components,
}) => {
  return (
    <ContentPartProvider partIndex={partIndex}>
      <MessageContentPartComponent components={components} />
    </ContentPartProvider>
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

export const MessagePrimitiveContent: FC<MessagePrimitiveContentProps> = ({
  components,
}) => {
  const { useMessage } = useMessageContext();

  const contentLength = useMessage((s) => s.message.content.length) || 1;

  return new Array(contentLength).fill(null).map((_, idx) => {
    const partIndex = idx; // use the index as key, as message is generally append only
    return (
      <MessageContentPart
        key={partIndex}
        partIndex={partIndex}
        components={components}
      />
    );
  });
};

MessagePrimitiveContent.displayName = "MessagePrimitive.Content";
