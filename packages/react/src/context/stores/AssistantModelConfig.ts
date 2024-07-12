"use client";

import { create } from "zustand";
import type { ModelConfigProvider } from "../../types/ModelConfigTypes";
import { ProxyConfigProvider } from "../../utils/ProxyConfigProvider";

export type AssistantModelConfigState = Readonly<
  ModelConfigProvider & {
    registerModelConfigProvider: (provider: ModelConfigProvider) => () => void;
  }
>;

export const makeAssistantModelConfigStore = () =>
  create<AssistantModelConfigState>(() => {
    const proxy = new ProxyConfigProvider();

    return Object.freeze({
      getModelConfig: () => {
        return proxy.getModelConfig();
      },
      registerModelConfigProvider: (provider: ModelConfigProvider) => {
        return proxy.registerModelConfigProvider(provider);
      },
    }) satisfies AssistantModelConfigState;
  });
