import { AppendMessage, ThreadMessage } from "../../types";
import { AttachmentAdapter } from "../attachment";
import { AddToolResultOptions, ThreadSuggestion } from "../core";
import { FeedbackAdapter } from "../feedback/FeedbackAdapter";
import { SpeechSynthesisAdapter } from "../speech/SpeechAdapterTypes";
import { ThreadMessageLike } from "./ThreadMessageLike";

export type ExternalStoreMessageConverter<T> = (
  message: T,
  idx: number,
) => ThreadMessageLike;

type ExternalStoreMessageConverterAdapter<T> = {
  convertMessage: ExternalStoreMessageConverter<T>;
};

type ExternalStoreAdapterBase<T> = {
  threadId?: string | undefined;
  isDisabled?: boolean | undefined;
  isRunning?: boolean | undefined;
  messages: T[];
  suggestions?: readonly ThreadSuggestion[] | undefined;
  extras?: unknown;

  setMessages?: ((messages: T[]) => void) | undefined;
  onNew: (message: AppendMessage) => Promise<void>;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onReload?: ((parentId: string | null) => Promise<void>) | undefined;
  onCancel?: (() => Promise<void>) | undefined;
  onAddToolResult?:
    | ((options: AddToolResultOptions) => Promise<void> | void)
    | undefined;
  onSwitchToThread?: ((threadId: string) => Promise<void> | void) | undefined;
  onSwitchToNewThread?: (() => Promise<void> | void) | undefined;
  onSpeak?:
    | ((message: ThreadMessage) => SpeechSynthesisAdapter.Utterance)
    | undefined;
  convertMessage?: ExternalStoreMessageConverter<T> | undefined;
  adapters?: {
    attachments?: AttachmentAdapter | undefined;
    feedback?: FeedbackAdapter | undefined;
  };
  unstable_capabilities?:
    | {
        copy?: boolean | undefined;
      }
    | undefined;
};

export type ExternalStoreAdapter<T = ThreadMessage> =
  ExternalStoreAdapterBase<T> &
    (T extends ThreadMessage
      ? object
      : ExternalStoreMessageConverterAdapter<T>);
