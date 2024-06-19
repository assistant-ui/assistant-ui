"use client";

import { type ComponentType, type FC, memo } from "react";
import { useAssistantContext, useContentPartContext } from "../../context";
import { useMessageContext } from "../../context/MessageContext";
import { ContentPartProvider } from "../../context/providers/ContentPartProvider";
import type {
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
} from "../../utils/AssistantTypes";
import { ContentPartDisplay } from "../contentPart/ContentPartDisplay";
import { ContentPartInProgressIndicator } from "../contentPart/ContentPartInProgressIndicator";
import { ContentPartText } from "../contentPart/ContentPartText";

type MessageContentProps = {
  components?: {
    Text?: ComponentType<{
      part: TextContentPart;
      status: "done" | "in_progress" | "error";
    }>;
    Image?: ComponentType<{
      part: ImageContentPart;
      status: "done" | "in_progress" | "error";
    }>;
    UI?: ComponentType<{
      part: UIContentPart;
      status: "done" | "in_progress" | "error";
    }>;
    tools?: {
      by_name?: Record<
        string,
        ComponentType<{
          part: ToolCallContentPart;
          status: "done" | "in_progress" | "error";
        }>
      >;
      Fallback?: ComponentType<{
        part: ToolCallContentPart;
        status: "done" | "in_progress" | "error";
      }>;
    };
  };
};

const defaultComponents = {
  Text: () => (
    <>
      <ContentPartText />
      <ContentPartInProgressIndicator />
    </>
  ),
  Image: () => null,
  UI: () => <ContentPartDisplay />,
  tools: {
    Fallback: (props) => {
      const { useToolRenderers } = useAssistantContext();
      const Render = useToolRenderers((s) =>
        s.getToolRenderer(props.part.toolName),
      );
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
  const { useContentPart } = useContentPartContext();
  const { part, status } = useContentPart();

  const type = part.type;
  switch (type) {
    case "text":
      return <Text part={part} status={status} />;

    case "image":
      return <Image part={part} status={status} />;

    case "ui":
      return <UI part={part} status={status} />;

    case "tool-call": {
      const Tool = by_name[part.toolName] || Fallback;
      return <Tool part={part} status={status} />;
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
