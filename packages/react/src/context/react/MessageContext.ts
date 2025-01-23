"use client";

import { createContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { MessageUtilsState } from "../stores/MessageUtils";
import { createContextHook } from "./utils/createContextHook";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { UseBoundStore } from "zustand";
import { MessageRuntime } from "../../api/MessageRuntime";
import { createStateHookForRuntime } from "./utils/createStateHookForRuntime";
import { EditComposerRuntime } from "../../api";

export type MessageContextValue = {
  useMessageRuntime: UseBoundStore<ReadonlyStore<MessageRuntime>>;
  useMessageUtils: UseBoundStore<ReadonlyStore<MessageUtilsState>>;
};

export const MessageContext = createContext<MessageContextValue | null>(null);

const useMessageContext = createContextHook(
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

export const useMessage = createStateHookForRuntime(useMessageRuntime);

const useEditComposerRuntime = (opt: {
  optional: boolean | undefined;
}): EditComposerRuntime | null => useMessageRuntime(opt)?.composer ?? null;
export const useEditComposer = createStateHookForRuntime(
  useEditComposerRuntime,
);

export const { useMessageUtils, useMessageUtilsStore } = createContextStoreHook(
  useMessageContext,
  "useMessageUtils",
);
