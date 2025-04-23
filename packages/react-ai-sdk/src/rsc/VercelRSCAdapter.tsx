import type { AppendMessage, ExternalStoreAdapter } from "@assistant-ui/react";
import type { VercelRSCMessage } from "./VercelRSCMessage";

type RSCMessageConverter<T> = {
  convertMessage: (message: T) => VercelRSCMessage;
};

type VercelRSCAdapterBase<T> = {
  isRunning?: boolean | undefined;
  messages: T[];

  onNew?: (message: AppendMessage) => Promise<void>;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onReload?: ((parentId: string | null) => Promise<void>) | undefined;
  convertMessage?: ((message: T) => VercelRSCMessage) | undefined;

  adapters?: ExternalStoreAdapter["adapters"] | undefined;
};

export type VercelRSCAdapter<T = VercelRSCMessage> = VercelRSCAdapterBase<T> &
  (T extends VercelRSCMessage ? object : RSCMessageConverter<T>);
