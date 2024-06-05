"use client";

import type { ComponentType, FC, ReactNode } from "react";
import { useAssistantContext } from "../../utils/context/AssistantContext";
import { useCombinedStore } from "../../utils/context/combined/useCombinedStore";
import type {
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
} from "../../utils/context/stores/AssistantTypes";
import { useMessageContext } from "../../utils/context/useMessageContext";
import { ContentPartLoadingIndicator } from "../contentPart/ContentPartLoadingIndicator";
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
  const { useThread } = useAssistantContext();
  const { useMessage } = useMessageContext();

  // TODO multiple store hooks
  const content = useMessage((s) => s.message.content);
  const isLoading = useCombinedStore(
    [useThread, useMessage],
    (t, s) => s.isLast && t.isRunning,
  );

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
          >
            {component}
          </ContentPartProvider>
        );
      })}
    </>
  );
};
