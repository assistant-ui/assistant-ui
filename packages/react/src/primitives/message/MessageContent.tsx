"use client";

import type { ComponentType, FC, ReactNode } from "react";
import type {
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
} from "../../utils/context/stores/AssistantTypes";
import { useMessageContext } from "../../utils/context/useMessageContext";
import { ContentPartInProgressIndicator } from "../contentPart/ContentPartInProgressIndicator";
import { ContentPartProvider } from "../contentPart/ContentPartProvider";

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

export const MessageContent: FC<MessageContentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Image = defaultComponents.Image,
    UI = defaultComponents.UI,
    tools: { by_name = {}, Fallback = defaultComponents.tools.Fallback } = {},
  } = {},
}) => {
  const { useMessage } = useMessageContext();

  const message = useMessage((s) => s.message);
  const content = message.content;
  const status = message.role === "assistant" ? message.status : "done";

  return (
    <>
      {content.map((part, i) => {
        const key = i; // use the index as key, as message is generally append only

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
          <ContentPartProvider
            key={key}
            part={part}
            status={i === content.length - 1 ? status : "done"}
          >
            {component}
          </ContentPartProvider>
        );
      })}
    </>
  );
};
