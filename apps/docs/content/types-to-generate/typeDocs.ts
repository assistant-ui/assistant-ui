import {
  AssistantRuntimeProvider,
  MessagePartState,
} from "@assistant-ui/react";
import { ComponentPropsWithRef } from "react";

export type AssistantRuntimeProvider = ComponentPropsWithRef<
  typeof AssistantRuntimeProvider
>;

export type {
  AssistantRuntime,
  AssistantToolUIsState,
  EditComposerState,
  ThreadListRuntime,
  ThreadListState,
  ThreadListItemRuntime,
  ThreadListItemState,
  ThreadRuntime,
  ThreadState,
  MessageRuntime,
  MessageState,
  MessagePartRuntime,
  ComposerRuntime,
  ThreadComposerRuntime,
  ComposerState,
  AttachmentRuntime,
  AttachmentState,
  ThreadComposerState,
} from "@assistant-ui/react";

export type TextMessagePartState = MessagePartState & { readonly type: "text" };
export type AudioMessagePartState = MessagePartState & {
  readonly type: "audio";
};
export type ImageMessagePartState = MessagePartState & {
  readonly type: "image";
};
export type SourceMessagePartState = MessagePartState & {
  readonly type: "source";
};
export type FileMessagePartState = MessagePartState & {
  readonly type: "file";
};
export type ToolCallMessagePartState = MessagePartState & {
  readonly type: "tool-call";
};
