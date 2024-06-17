"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/AssistantContext";
import type { Tool } from "../utils/ModelConfigTypes";

export const useAssistantTool = <T,>(tool: Tool<T>) => {
  const { useModelConfig } = useAssistantContext();
  const registerModelConfigProvider = useModelConfig(
    (s) => s.registerModelConfigProvider,
  );
  useEffect(
    () =>
      registerModelConfigProvider(() => {
        return {
          tools: {
            [tool.name]: tool,
          },
        };
      }),
    [registerModelConfigProvider, tool],
  );
};
