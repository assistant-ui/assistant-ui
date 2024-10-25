"use client";

import { createContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { MessageUtilsState } from "../stores/MessageUtils";
import { createContextHook } from "./utils/createContextHook";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { UseBoundStore } from "zustand";
import { MessageRuntime } from "../../api/MessageRuntime";
import { MessageState } from "../../api/MessageRuntime";
import { EditComposerState } from "../../api/ComposerRuntime";

export type MessageContextValue = {
  useMessageRuntime: UseBoundStore<ReadonlyStore<MessageRuntime>>;
  useMessage: UseBoundStore<ReadonlyStore<MessageState>>;
  useMessageUtils: UseBoundStore<ReadonlyStore<MessageUtilsState>>;
  useEditComposer: UseBoundStore<ReadonlyStore<EditComposerState>>;
};

export const MessageContext = createContext<MessageContextValue | null>(null);

export const useMessageContext = createContextHook(
  MessageContext,
  "a component passed to <ThreadPrimitive.Messages components={...} />",
);

export function useMessageRuntime(options?: {
  optional?: false | undefined;
}): MessageRuntime;
export function useMessageRuntime(options?: {
  optional?: boolean | undefined;
}): MessageRuntime | null;
export function useMessageRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const context = useMessageContext(options);
  if (!context) return null;
  return context.useMessageRuntime();
}

export const { useMessage, useMessageStore } = createContextStoreHook(
  useMessageContext,
  "useMessage",
);

export const { useMessageUtils, useMessageUtilsStore } = createContextStoreHook(
  useMessageContext,
  "useMessageUtils",
);

export const { useEditComposer, useEditComposerStore } = createContextStoreHook(
  useMessageContext,
  "useEditComposer",
);
