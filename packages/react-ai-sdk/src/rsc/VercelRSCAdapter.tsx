"use client";
import type { AppendMessage } from "@assistant-ui/react";
import type { VercelRSCMessage } from "./VercelRSCMessage";

type RSCMessageConverter<T> = {
  convertMessage: (message: T) => VercelRSCMessage;
};

type VercelRSCAdapterBase<T> = {
  messages: T[];
  append: (message: AppendMessage) => Promise<void>;
  edit?: (message: AppendMessage) => Promise<void>;
  reload?: (parentId: string | null) => Promise<void>;
  convertMessage?: (message: T) => VercelRSCMessage;
};

export type VercelRSCAdapter<T = VercelRSCMessage> = VercelRSCAdapterBase<T> &
  (T extends VercelRSCMessage ? object : RSCMessageConverter<T>);
