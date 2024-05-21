"use client";

import type { ComponentType, FC } from "react";
import type {
  ThreadMessageImagePart,
  ThreadMessageTextPart,
  ThreadMessageToolCallPart,
  ThreadMessageUIPart,
} from "../../utils/context/AssistantTypes";
import { useMessageContext } from "../../utils/context/MessageContext";

type MessageContentProps = {
  components?: {
    Text?: ComponentType<{ part: ThreadMessageTextPart }>;
    Image?: ComponentType<{ part: ThreadMessageImagePart }>;
    UI?: ComponentType<{ part: ThreadMessageUIPart }>;
    tools?: {
      by_name?: Record<
        string,
        ComponentType<{ part: ThreadMessageToolCallPart }>
      >;
      Fallback?: ComponentType<{ part: ThreadMessageToolCallPart }>;
    };
  };
};

const defaultComponents = {
  Text: ({ part }) => <>{part.text}</>,
  Image: () => null,
  UI: ({ part }) => part.display,
  tools: {
    Fallback: () => null,
  },
} satisfies MessageContentProps["components"];

export const MessageContent: FC<MessageContentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Image = defaultComponents.Image,
    UI = defaultComponents.UI,
    tools: { by_name = {}, Fallback = defaultComponents.tools.Fallback } = {},
  } = {},
}) => {
  const { useMessage } = useMessageContext();
  const content = useMessage((s) => s.message.content);

  return (
    <>
      {content.map((part, i) => {
        const key = i; // use the index as key, as message is generally append only

        switch (part.type) {
          case "text":
            return <Text key={key} part={part} />;
          case "image":
            return <Image key={key} part={part} />;
          case "ui":
            return <UI key={key} part={part} />;
          case "tool-call": {
            const Tool = by_name[part.name] || Fallback;
            return <Tool key={key} part={part} />;
          }
          default:
            return null;
        }
      })}
    </>
  );
};
