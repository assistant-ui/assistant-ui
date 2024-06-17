"use client";

import { type ComponentType, type FC, type ReactNode, memo } from "react";
import { useMessageContext } from "../../context/MessageContext";
import { ContentPartProvider } from "../../context/providers/ContentPartProvider";
import type {
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
} from "../../utils/AssistantTypes";
import { ContentPartInProgressIndicator } from "../contentPart/ContentPartInProgressIndicator";

type MessageContentProps = {
  components?: {
    Text?: ComponentType<{ part: TextContentPart }>;
    Image?: ComponentType<{ part: ImageContentPart }>;
    UI?: ComponentType<{ part: UIContentPart }>;
    tools?: {
      by_name?: Record<string, ComponentType<{ part: ToolCallContentPart }>>;
      Fallback?: ComponentType<{ part: ToolCallContentPart }>;
    };
  };
};

const defaultComponents = {
  Text: ({ part }) => (
    <>
      {part.text}
      <ContentPartInProgressIndicator />
    </>
  ),
  Image: () => null,
  UI: ({ part }) => part.display,
  tools: {
    Fallback: () => null,
  },
} satisfies MessageContentProps["components"];

type MessageContentPartProps = {
  partIndex: number;
  components: MessageContentProps["components"];
};

const MessageContentPartImpl: FC<MessageContentPartProps> = ({
  partIndex,
  components: {
    Text = defaultComponents.Text,
    Image = defaultComponents.Image,
    UI = defaultComponents.UI,
    tools: { by_name = {}, Fallback = defaultComponents.tools.Fallback } = {},
  } = {},
}) => {
  const { useMessage } = useMessageContext();

  const part = useMessage((s) => s.message.content[partIndex]!);

  const type = part.type;
  let component: ReactNode | null = null;
  switch (type) {
    case "text":
      component = <Text part={part} />;
      break;

    case "image":
      component = <Image part={part} />;
      break;
    case "ui":
      component = <UI part={part} />;
      break;
    case "tool-call": {
      const Tool = by_name[part.name] || Fallback;
      component = <Tool part={part} />;
      break;
    }
    default:
      throw new Error(`Unknown content part type: ${type}`);
  }

  return (
    <ContentPartProvider key={partIndex} partIndex={partIndex}>
      {component}
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
