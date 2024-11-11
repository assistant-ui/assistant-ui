import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { ComponentPropsWithRef } from "react";

export type AssistantRuntimeProvider = ComponentPropsWithRef<
  typeof AssistantRuntimeProvider
>;

export type {
  AssistantRuntime,
  AssistantToolUIsState,
  ThreadListRuntime,
  ThreadListState,
  ThreadListItemRuntime,
  ThreadListItemState,
  ThreadRuntime,
  ThreadState,
  MessageRuntime,
  MessageState,
  ContentPartRuntime,
  ContentPartState,
  ComposerRuntime,
  ComposerState,
  AttachmentRuntime,
  AttachmentState,
} from "@assistant-ui/react";
