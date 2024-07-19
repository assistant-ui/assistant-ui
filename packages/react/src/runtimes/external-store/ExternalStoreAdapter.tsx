import { AddToolResultOptions } from "../../context";
import { AppendMessage, ThreadMessage } from "../../types";

export type ExternalStoreMessageConverter<T> = (
  message: T,
  idx: number,
) => ThreadMessage;

type ExternalStoreMessageConverterAdapter<T> = {
  convertMessage: ExternalStoreMessageConverter<T>;
};

type ExternalStoreAdapterBase<T> = {
  threadId?: string;
  isRunning?: boolean;
  messages: T[];
  setMessages?: (messages: T[]) => void;
  onNew: (message: AppendMessage) => Promise<void>;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onReload?: ((parentId: string | null) => Promise<void>) | undefined;
  onCancel?: (() => Promise<void>) | undefined;
  onNewThread?: () => Promise<void> | void;
  onAddToolResult?: (options: AddToolResultOptions) => Promise<void> | void;
  onSwitchThread?: (threadId: string | null) => Promise<void> | void;
  convertMessage?: ExternalStoreMessageConverter<T> | undefined;
};

export type ExternalStoreAdapter<T = ThreadMessage> =
  ExternalStoreAdapterBase<T> &
    (T extends ThreadMessage
      ? object
      : ExternalStoreMessageConverterAdapter<T>);
