"use client";

import { create } from "zustand";
import type { ModelConfigProvider } from "../../utils/ModelConfigTypes";
import { ProxyConfigProvider } from "../../utils/ProxyConfigProvider";

export type AssistantModelConfigState = {
  getModelConfig: ModelConfigProvider;
  registerModelConfigProvider: (provider: ModelConfigProvider) => () => void;
};

export const makeAssistantModelConfigStore = () =>
  create<AssistantModelConfigState>(() => {
    const proxy = new ProxyConfigProvider();

    return {
      getModelConfig: () => {
        return proxy.getModelConfig();
      },
      registerModelConfigProvider: (provider: ModelConfigProvider) => {
        return proxy.registerModelConfigProvider(provider);
      },
    } satisfies AssistantModelConfigState;
  });
