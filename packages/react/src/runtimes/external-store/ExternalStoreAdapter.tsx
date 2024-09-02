import { AddToolResultOptions } from "../../context";
import { AppendMessage, ThreadMessage } from "../../types";
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
  setMessages?: ((messages: T[]) => void) | undefined;
  onNew: (message: AppendMessage) => Promise<void>;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onReload?: ((parentId: string | null) => Promise<void>) | undefined;
  onCancel?: (() => Promise<void>) | undefined;
  onNewThread?: (() => Promise<void> | void) | undefined;
  onAddToolResult?:
    | ((options: AddToolResultOptions) => Promise<void> | void)
    | undefined;
  onSwitchThread?:
    | ((threadId: string | null) => Promise<void> | void)
    | undefined;
  onSpeak?:
    | ((message: ThreadMessage) => SpeechSynthesisAdapter.Utterance)
    | undefined;
  convertMessage?: ExternalStoreMessageConverter<T> | undefined;
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
