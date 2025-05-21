import {
  AssistantRuntimeProvider,
  ContentPartState,
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
  ContentPartRuntime,
  ComposerRuntime,
  ThreadComposerRuntime,
  ComposerState,
  AttachmentRuntime,
  AttachmentState,
  ThreadComposerState,
} from "@assistant-ui/react";

export type TextContentPartState = ContentPartState & { readonly type: "text" };
export type AudioContentPartState = ContentPartState & {
  readonly type: "audio";
};
export type ImageContentPartState = ContentPartState & {
  readonly type: "image";
};
export type SourceContentPartState = ContentPartState & {
  readonly type: "source";
};
export type FileContentPartState = ContentPartState & {
  readonly type: "file";
};
export type ToolCallContentPartState = ContentPartState & {
  readonly type: "tool-call";
};
