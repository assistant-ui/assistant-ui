import { type ReactElement, Fragment, useMemo } from "react";
import type {
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  MessagePartState,
} from "@assistant-ui/core";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  ToolCallMessagePartProps,
  DataMessagePartProps,
  DataMessagePartComponent,
} from "@assistant-ui/core/react";
import { PartByIndexProvider } from "@assistant-ui/core/react";
import { ToolFallback } from "../toolCall/ToolFallback";
import * as MessagePartPrimitive from "../messagePart";

type MessageContentPart = ThreadUserMessagePart | ThreadAssistantMessagePart;
type MessageContentStatePart = MessagePartState;

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

const DefaultTextRenderer = ({ index }: { index: number }) => {
  return (
    <PartByIndexProvider index={index}>
      <MessagePartPrimitive.Text />
    </PartByIndexProvider>
  );
};

const ToolUIDisplay = ({
  Fallback,
  part,
  index,
}: {
  Fallback:
    | ((props: {
        part: Extract<MessageContentPart, { type: "tool-call" }>;
        index: number;
      }) => ReactElement)
    | undefined;
  part: Extract<MessageContentStatePart, { type: "tool-call" }>;
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
  const toolProps = {
    ...(part as ToolCallMessagePartProps),
    addResult: partMethods.addToolResult,
    resume: partMethods.resumeToolCall,
  };

  if (Render) {
    return <Render {...toolProps} />;
  }
  if (Fallback) return <Fallback part={part} index={index} />;
  return <ToolFallback {...toolProps} />;
};

const DataUIDisplay = ({
  Fallback,
  part,
  index,
}: {
  Fallback:
    | ((props: {
        part: Extract<MessageContentPart, { type: "data" }>;
        index: number;
      }) => ReactElement)
    | undefined;
  part: Extract<MessageContentStatePart, { type: "data" }>;
  index: number;
}) => {
  const Render = useAuiState<DataMessagePartComponent | undefined>((s) => {
    const named = s.dataRenderers.renderers[part.name];
    if (Array.isArray(named)) return named[0];
    if (named) return named;
    const fallback = s.dataRenderers.fallbacks?.[0];
    if (fallback) return fallback;
    return undefined;
  });
  if (Render) return <Render {...(part as DataMessagePartProps)} />;
  if (Fallback) return <Fallback part={part} index={index} />;
  return (
    <PartByIndexProvider index={index}>
      <MessagePartPrimitive.Data />
    </PartByIndexProvider>
  );
};

const DefaultImageRenderer = ({ index }: { index: number }) => (
  <PartByIndexProvider index={index}>
    <MessagePartPrimitive.Image />
  </PartByIndexProvider>
);

const DefaultReasoningRenderer = ({ index }: { index: number }) => (
  <PartByIndexProvider index={index}>
    <MessagePartPrimitive.Reasoning />
  </PartByIndexProvider>
);

const DefaultSourceRenderer = ({ index }: { index: number }) => (
  <PartByIndexProvider index={index}>
    <MessagePartPrimitive.Source />
  </PartByIndexProvider>
);

const DefaultFileRenderer = ({ index }: { index: number }) => (
  <PartByIndexProvider index={index}>
    <MessagePartPrimitive.File />
  </PartByIndexProvider>
);

export const MessageContent = ({
  renderText,
  renderToolCall,
  renderImage,
  renderReasoning,
  renderSource,
  renderFile,
  renderData,
}: MessageContentProps) => {
  const content = useAuiState((s) => s.message.parts);

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
                  <DefaultTextRenderer index={index} />
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
            return (
              <Fragment key={key}>
                {renderImage ? (
                  renderImage({ part, index })
                ) : (
                  <DefaultImageRenderer index={index} />
                )}
              </Fragment>
            );
          case "reasoning":
            return (
              <Fragment key={key}>
                {renderReasoning ? (
                  renderReasoning({ part, index })
                ) : (
                  <DefaultReasoningRenderer index={index} />
                )}
              </Fragment>
            );
          case "source":
            return (
              <Fragment key={key}>
                {renderSource ? (
                  renderSource({ part, index })
                ) : (
                  <DefaultSourceRenderer index={index} />
                )}
              </Fragment>
            );
          case "file":
            return (
              <Fragment key={key}>
                {renderFile ? (
                  renderFile({ part, index })
                ) : (
                  <DefaultFileRenderer index={index} />
                )}
              </Fragment>
            );
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
