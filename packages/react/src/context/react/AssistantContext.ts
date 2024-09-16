"use client";

import { createContext } from "react";
import type { AssistantToolUIsState } from "../stores/AssistantToolUIs";
import { ReadonlyStore } from "../ReadonlyStore";
import { AssistantActionsState } from "../stores/AssistantActions";
import { AssistantRuntime } from "../../runtimes";
import { createContextHook } from "./utils/createContextHook";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { UseBoundStore } from "zustand";

export type AssistantContextValue = {
  useToolUIs: UseBoundStore<ReadonlyStore<AssistantToolUIsState>>;
  useAssistantRuntime: UseBoundStore<ReadonlyStore<AssistantRuntime>>;
  useAssistantActions: UseBoundStore<ReadonlyStore<AssistantActionsState>>;
};

export const AssistantContext = createContext<AssistantContextValue | null>(
  null,
);

export const useAssistantContext = createContextHook(
  AssistantContext,
  "AssistantRuntimeProvider",
);

export const { useAssistantRuntime, useAssistantRuntimeStore } =
  createContextStoreHook(useAssistantContext, "useAssistantRuntime");

export const { useToolUIs, useToolUIsStore } = createContextStoreHook(
  useAssistantContext,
  "useToolUIs",
);

export const { useAssistantActions, useAssistantActionsStore } =
  createContextStoreHook(useAssistantContext, "useAssistantActions");
