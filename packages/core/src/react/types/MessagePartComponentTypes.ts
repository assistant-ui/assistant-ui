import type { ComponentType, PropsWithChildren } from "react";
import type {
  MessagePartStatus,
  DataMessagePart,
  FileMessagePart,
  GenerativeUIMessagePart,
  GenerativeUISpec,
  ImageMessagePart,
  ReasoningMessagePart,
  SourceMessagePart,
  TextMessagePart,
  ToolCallMessagePart,
  Unstable_AudioMessagePart,
  VideoMessagePart,
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

export type VideoMessagePartProps = MessagePartState & VideoMessagePart;
export type VideoMessagePartComponent = ComponentType<VideoMessagePartProps>;

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
    /**
     * Responds to a server-side tool approval gate. Only valid while
     * `approval` is set on the part and `approval.approved === undefined`.
     */
    respondToApproval: (response: {
      approved: boolean;
      reason?: string;
    }) => void;
  };

/** Component used to render a tool-call message part. */
export type ToolCallMessagePartComponent<
  TArgs = any,
  TResult = any,
> = ComponentType<ToolCallMessagePartProps<TArgs, TResult>>;

export type QuoteMessagePartProps = QuoteInfo;
export type QuoteMessagePartComponent = ComponentType<QuoteMessagePartProps>;

/**
 * The consumer-provided allowlist of components a generative-ui spec is
 * permitted to render. Keys are the component names referenced in the spec
 * (e.g. `"Card"`, `"Button"`); values are the React components.
 *
 * This registry is the security boundary in the same-realm rendering path —
 * any name not present in the registry is rejected with a typed error.
 */
export type GenerativeUIComponentRegistry = Record<string, ComponentType<any>>;

export type GenerativeUIMessagePartProps = MessagePartState &
  GenerativeUIMessagePart;
export type GenerativeUIMessagePartComponent =
  ComponentType<GenerativeUIMessagePartProps>;

export type GenerativeUIRenderProps = {
  /** The JSON spec to render. */
  spec: GenerativeUISpec;
  /** The component allowlist. */
  components: GenerativeUIComponentRegistry;
  /** Optional fallback for unknown component names. */
  Fallback?: ComponentType<{ component: string; props?: unknown }> | undefined;
};
