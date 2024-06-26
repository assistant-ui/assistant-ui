"use client";

import { type ComponentType, type FC, memo } from "react";
import {
  useAssistantContext,
  useContentPartContext,
  useThreadContext,
} from "../../context";
import { useMessageContext } from "../../context/react/MessageContext";
import { ContentPartProvider } from "../../context/providers/ContentPartProvider";
import { ContentPartDisplay } from "../contentPart/ContentPartDisplay";
import { ContentPartInProgressIndicator } from "../contentPart/ContentPartInProgressIndicator";
import { ContentPartText } from "../contentPart/ContentPartText";
import type {
  ImageContentPartComponent,
  TextContentPartComponent,
  ToolCallContentPartComponent,
  ToolCallContentPartProps,
  UIContentPartComponent,
} from "../../types/ContentPartComponentTypes";

export type MessageContentProps = {
  components?: {
    Text?: TextContentPartComponent;
    Image?: ImageContentPartComponent;
    UI?: UIContentPartComponent;
    tools?: {
      by_name?: Record<string, ToolCallContentPartComponent>;
      Fallback?: ComponentType<ToolCallContentPartProps>;
    };
  };
};

const defaultComponents = {
  Text: () => (
    <>
      <ContentPartText style={{ whiteSpace: "pre-line" }} />
      <ContentPartInProgressIndicator />
    </>
  ),
  Image: () => null,
  UI: () => <ContentPartDisplay />,
  tools: {
    Fallback: (props) => {
      const { useToolUIs } = useAssistantContext();
      const Render = useToolUIs((s) => s.getToolUI(props.part.toolName));
      if (!Render) return null;
      return <Render {...props} />;
    },
  },
} satisfies MessageContentProps["components"];

type MessageContentPartComponentProps = {
  components: MessageContentProps["components"];
};

const MessageContentPartComponent: FC<MessageContentPartComponentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Image = defaultComponents.Image,
    UI = defaultComponents.UI,
    tools: { by_name = {}, Fallback = defaultComponents.tools.Fallback } = {},
  } = {},
}) => {
  const { useThreadActions } = useThreadContext();
  const addToolResult = useThreadActions((t) => t.addToolResult);

  const { useContentPart } = useContentPartContext();
  const { part, status } = useContentPart();

  const type = part.type;
  switch (type) {
    case "text":
      return <Text part={part} status={status} />;

    case "image":
      // eslint-disable-next-line jsx-a11y/alt-text -- not a real image
      return <Image part={part} status={status} />;

    case "ui":
      return <UI part={part} status={status} />;

    case "tool-call": {
      const Tool = by_name[part.toolName] || Fallback;
      const addResult = (result: any) => addToolResult(part.toolCallId, result);
      return <Tool part={part} status={status} addResult={addResult} />;
    }
    default:
      throw new Error(`Unknown content part type: ${type}`);
  }
};

type MessageContentPartProps = {
  partIndex: number;
  components: MessageContentProps["components"];
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

export const MessageContent: FC<MessageContentProps> = ({ components }) => {
  const { useMessage } = useMessageContext();

  const contentLength = useMessage((s) => s.message.content.length);

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
