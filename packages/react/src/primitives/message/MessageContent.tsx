"use client";

import { type ComponentType, type FC, memo, useMemo } from "react";
import {
  useContentPart,
  useContentPartRuntime,
  useToolUIs,
} from "../../context";
import {
  useMessage,
  useMessageRuntime,
} from "../../context/react/MessageContext";
import { ContentPartRuntimeProvider } from "../../context/providers/ContentPartRuntimeProvider";
import { ContentPartPrimitiveText } from "../contentPart/ContentPartText";
import { ContentPartPrimitiveImage } from "../contentPart/ContentPartImage";
import { ContentPartPrimitiveDisplay } from "../contentPart/ContentPartDisplay";
import type {
  Unstable_AudioContentPartComponent,
  EmptyContentPartComponent,
  ImageContentPartComponent,
  TextContentPartComponent,
  ToolCallContentPartComponent,
  ToolCallContentPartProps,
  UIContentPartComponent,
} from "../../types/ContentPartComponentTypes";
import { ContentPartPrimitiveInProgress } from "../contentPart/ContentPartInProgress";
import { EMPTY_CONTENT_SYMBOL } from "../../api/MessageRuntime";

export namespace MessagePrimitiveContent {
  export type Props = {
    components?:
      | {
          Empty?: EmptyContentPartComponent | undefined;
          Text?: TextContentPartComponent | undefined;
          Image?: ImageContentPartComponent | undefined;
          Unstable_Audio?: Unstable_AudioContentPartComponent | undefined;
          UI?: UIContentPartComponent | undefined;
          tools?:
            | {
                by_name?:
                  | Record<string, ToolCallContentPartComponent | undefined>
                  | undefined;
                Fallback?: ComponentType<ToolCallContentPartProps> | undefined;
              }
            | {
                Override: ComponentType<ToolCallContentPartProps>;
              }
            | undefined;
        }
      | undefined;
  };
}

const ToolUIDisplay = ({
  Fallback,
  ...props
}: {
  Fallback: ToolCallContentPartComponent | undefined;
} & ToolCallContentPartProps) => {
  const Render = useToolUIs((s) => s.getToolUI(props.toolName)) ?? Fallback;
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
  Unstable_Audio: () => null,
  UI: () => <ContentPartPrimitiveDisplay />,
} satisfies MessagePrimitiveContent.Props["components"];

type MessageContentPartComponentProps = {
  components: MessagePrimitiveContent.Props["components"];
};

const MessageContentPartComponent: FC<MessageContentPartComponentProps> = ({
  components: {
    Text = defaultComponents.Text,
    Empty,
    Image = defaultComponents.Image,
    UI = defaultComponents.UI,
    Unstable_Audio: Audio = defaultComponents.Unstable_Audio,
    tools = {},
  } = {},
}) => {
  const contentPartRuntime = useContentPartRuntime();

  const part = useContentPart();

  const type = part.type;
  if (type === "tool-call") {
    const addResult = (result: any) => contentPartRuntime.addToolResult(result);
    if ("Override" in tools)
      return <tools.Override {...part} addResult={addResult} />;
    const Tool = tools.by_name?.[part.toolName] ?? tools.Fallback;
    return <ToolUIDisplay {...part} Fallback={Tool} addResult={addResult} />;
  }

  if (part.status.type === "requires-action")
    throw new Error("Encountered unexpected requires-action status");

  switch (type) {
    case "text":
      if ((part as any)[EMPTY_CONTENT_SYMBOL] && !!Empty) {
        return <Empty status={part.status} />;
      }

      return <Text {...part} />;

    case "image":
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image {...part} />;

    case "audio":
      return <Audio {...part} />;

    case "ui":
      return <UI {...part} />;

    default:
      const unhandledType: never = type;
      throw new Error(`Unknown content part type: ${unhandledType}`);
  }
};

type MessageContentPartProps = {
  partIndex: number;
  components: MessagePrimitiveContent.Props["components"];
};

const MessageContentPartImpl: FC<MessageContentPartProps> = ({
  partIndex,
  components,
}) => {
  const messageRuntime = useMessageRuntime();
  const runtime = useMemo(
    () => messageRuntime.getContentPartByIndex(partIndex),
    [messageRuntime, partIndex],
  );

  return (
    <ContentPartRuntimeProvider runtime={runtime}>
      <MessageContentPartComponent components={components} />
    </ContentPartRuntimeProvider>
  );
};

const MessageContentPart = memo(
  MessageContentPartImpl,
  (prev, next) =>
    prev.partIndex === next.partIndex &&
    prev.components?.Text === next.components?.Text &&
    prev.components?.Image === next.components?.Image &&
    prev.components?.Unstable_Audio === next.components?.Unstable_Audio &&
    prev.components?.UI === next.components?.UI &&
    prev.components?.tools === next.components?.tools,
);

export const MessagePrimitiveContent: FC<MessagePrimitiveContent.Props> = ({
  components,
}) => {
  const contentLength = useMessage((s) => s.content.length) || 1;

  return Array.from({ length: contentLength }, (_, index) => (
    <MessageContentPart key={index} partIndex={index} components={components} />
  ));
};

MessagePrimitiveContent.displayName = "MessagePrimitive.Content";
