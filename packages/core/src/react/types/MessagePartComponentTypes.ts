import type { ComponentType, PropsWithChildren } from "react";
import type {
  MessagePartStatus,
  DataMessagePart,
  FileMessagePart,
  ImageMessagePart,
  ReasoningMessagePart,
  SourceMessagePart,
  TextMessagePart,
  ToolCallMessagePart,
  Unstable_AudioMessagePart,
  QuoteInfo,
} from "../..";
import type { MessagePartState } from "../..";
import type { ToolResponse } from "assistant-stream";

export type EmptyMessagePartProps = {
  status: MessagePartStatus;
};
export type EmptyMessagePartComponent = ComponentType<EmptyMessagePartProps>;

export type TextMessagePartProps = MessagePartState & TextMessagePart;
export type TextMessagePartComponent = ComponentType<TextMessagePartProps>;

export type ReasoningMessagePartProps = MessagePartState & ReasoningMessagePart;
export type ReasoningMessagePartComponent =
  ComponentType<ReasoningMessagePartProps>;

export type ReasoningGroupProps = PropsWithChildren<{
  startIndex: number;
  endIndex: number;
}>;
export type ReasoningGroupComponent = ComponentType<ReasoningGroupProps>;

export type SourceMessagePartProps = MessagePartState & SourceMessagePart;
export type SourceMessagePartComponent = ComponentType<SourceMessagePartProps>;

export type ImageMessagePartProps = MessagePartState & ImageMessagePart;
export type ImageMessagePartComponent = ComponentType<ImageMessagePartProps>;

export type FileMessagePartProps = MessagePartState & FileMessagePart;
export type FileMessagePartComponent = ComponentType<FileMessagePartProps>;

export type Unstable_AudioMessagePartProps = MessagePartState &
  Unstable_AudioMessagePart;
export type Unstable_AudioMessagePartComponent =
  ComponentType<Unstable_AudioMessagePartProps>;

export type DataMessagePartProps<T = any> = MessagePartState &
  DataMessagePart<T>;
export type DataMessagePartComponent<T = any> = ComponentType<
  DataMessagePartProps<T>
>;

export type ToolCallMessagePartProps<
  TArgs = any,
  TResult = unknown,
> = MessagePartState &
  ToolCallMessagePart<TArgs, TResult> & {
    /**
     * Sets the result for this tool-call message part.
     *
     * Use when the renderer, rather than a tool `execute` function, is the
     * source of the result.
     */
    addResult: (result: TResult | ToolResponse<TResult>) => void;
    /**
     * Supplies the payload requested by `context.human(...)` and resumes the
     * paused frontend tool execution.
     */
    resume: (payload: unknown) => void;
  };

/** Component used to render a tool-call message part. */
export type ToolCallMessagePartComponent<
  TArgs = any,
  TResult = any,
> = ComponentType<ToolCallMessagePartProps<TArgs, TResult>>;

export type QuoteMessagePartProps = QuoteInfo;
export type QuoteMessagePartComponent = ComponentType<QuoteMessagePartProps>;
