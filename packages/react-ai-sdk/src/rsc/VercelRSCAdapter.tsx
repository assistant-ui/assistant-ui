"use client";
import type { AppendMessage } from "@assistant-ui/react";
import type { VercelRSCMessage } from "./VercelRSCMessage";

type RSCMessageConverter<T> = {
  convertMessage: (message: T) => VercelRSCMessage;
};

type VercelRSCAdapterBase<T> = {
  messages: T[];
  onNew?: (message: AppendMessage) => Promise<void>;
  onEdit?: ((message: AppendMessage) => Promise<void>) | undefined;
  onReload?: ((parentId: string | null) => Promise<void>) | undefined;
  convertMessage?: ((message: T) => VercelRSCMessage) | undefined;

  /**
   * @deprecated Use `onNew` instead. This will be removed in 0.6.0.
   */
  append?: (message: AppendMessage) => Promise<void>;
  /**
   * @deprecated Use `onEdit` instead. This will be removed in 0.6.0.
   */
  edit?: ((message: AppendMessage) => Promise<void>) | undefined;
  /**
   * @deprecated Use `onReload` instead. This will be removed in 0.6.0.
   */
  reload?: ((parentId: string | null) => Promise<void>) | undefined;
};

export type VercelRSCAdapter<T = VercelRSCMessage> = VercelRSCAdapterBase<T> &
  (T extends VercelRSCMessage ? object : RSCMessageConverter<T>);
