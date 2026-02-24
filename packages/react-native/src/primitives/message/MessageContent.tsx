import { type ReactElement, Fragment, useMemo } from "react";
import { Text } from "react-native";
import type {
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  ToolCallMessagePart,
  DataMessagePart,
} from "@assistant-ui/core";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  ToolCallMessagePartProps,
  DataMessagePartProps,
} from "../../types/MessagePartComponentTypes";

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

const ToolUIDisplay = ({
  Fallback,
  part,
  index,
}: {
  Fallback:
    | ((props: { part: ToolCallMessagePart; index: number }) => ReactElement)
    | undefined;
  part: ToolCallMessagePart;
  index: number;
}) => {
  const aui = useAui();
  const Render = useAuiState((s) => {
    const renders = s.tools.tools[part.toolName];
    if (Array.isArray(renders)) return renders[0];
    return renders;
  });

  const partMethods = useMemo(
    () => aui.message().part({ index }),
    [aui, index],
  );

  if (Render) {
    return (
      <Render
        {...(part as ToolCallMessagePartProps)}
        addResult={partMethods.addToolResult}
        resume={partMethods.resumeToolCall}
      />
    );
  }
  if (Fallback) return <Fallback part={part} index={index} />;
  return null;
};

const DataUIDisplay = ({
  Fallback,
  part,
  index,
}: {
  Fallback:
    | ((props: { part: DataMessagePart; index: number }) => ReactElement)
    | undefined;
  part: DataMessagePart;
  index: number;
}) => {
  const Render = useAuiState((s) => {
    const renders = s.dataRenderers.renderers[part.name];
    if (Array.isArray(renders)) return renders[0];
    return renders;
  });
  if (Render) return <Render {...(part as DataMessagePartProps)} />;
  if (Fallback) return <Fallback part={part} index={index} />;
  return null;
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
  const content = useAuiState((s) => s.message.content);

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
            return (
              <Fragment key={key}>
                <ToolUIDisplay
                  Fallback={renderToolCall}
                  part={part}
                  index={index}
                />
              </Fragment>
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
            return (
              <Fragment key={key}>
                <DataUIDisplay
                  Fallback={renderData}
                  part={part}
                  index={index}
                />
              </Fragment>
            );
          default:
            return null;
        }
      })}
    </>
  );
};
