import { type ReactElement, Fragment } from "react";
import { Text } from "react-native";
import type {
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
} from "@assistant-ui/core";
import { useMessage } from "../../hooks/useMessage";

type MessageContentPart = ThreadUserMessagePart | ThreadAssistantMessagePart;

export type MessageContentProps = {
  renderText?: (props: {
    part: Extract<MessageContentPart, { type: "text" }>;
    index: number;
  }) => ReactElement;
  renderToolCall?: (props: {
    part: Extract<MessageContentPart, { type: "tool-call" }>;
    index: number;
  }) => ReactElement;
  renderImage?: (props: {
    part: Extract<MessageContentPart, { type: "image" }>;
    index: number;
  }) => ReactElement;
  renderReasoning?: (props: {
    part: Extract<MessageContentPart, { type: "reasoning" }>;
    index: number;
  }) => ReactElement;
  renderSource?: (props: {
    part: Extract<MessageContentPart, { type: "source" }>;
    index: number;
  }) => ReactElement;
  renderFile?: (props: {
    part: Extract<MessageContentPart, { type: "file" }>;
    index: number;
  }) => ReactElement;
  renderData?: (props: {
    part: Extract<MessageContentPart, { type: "data" }>;
    index: number;
  }) => ReactElement;
};

const DefaultTextRenderer = ({
  part,
}: {
  part: Extract<MessageContentPart, { type: "text" }>;
}) => {
  return <Text>{part.text}</Text>;
};

export const MessageContent = ({
  renderText,
  renderToolCall,
  renderImage,
  renderReasoning,
  renderSource,
  renderFile,
  renderData,
}: MessageContentProps) => {
  const content = useMessage((s) => s.content);

  return (
    <>
      {content.map((part, index) => {
        const key = `${part.type}-${index}`;
        switch (part.type) {
          case "text":
            return (
              <Fragment key={key}>
                {renderText ? (
                  renderText({ part, index })
                ) : (
                  <DefaultTextRenderer part={part} />
                )}
              </Fragment>
            );
          case "tool-call":
            if (!renderToolCall) return null;
            return (
              <Fragment key={key}>{renderToolCall({ part, index })}</Fragment>
            );
          case "image":
            if (!renderImage) return null;
            return (
              <Fragment key={key}>{renderImage({ part, index })}</Fragment>
            );
          case "reasoning":
            if (!renderReasoning) return null;
            return (
              <Fragment key={key}>{renderReasoning({ part, index })}</Fragment>
            );
          case "source":
            if (!renderSource) return null;
            return (
              <Fragment key={key}>{renderSource({ part, index })}</Fragment>
            );
          case "file":
            if (!renderFile) return null;
            return <Fragment key={key}>{renderFile({ part, index })}</Fragment>;
          case "data":
            if (!renderData) return null;
            return <Fragment key={key}>{renderData({ part, index })}</Fragment>;
          default:
            return null;
        }
      })}
    </>
  );
};
