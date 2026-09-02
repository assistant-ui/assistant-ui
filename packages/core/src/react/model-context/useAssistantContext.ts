import { useEffect, useInsertionEffect, useRef } from "react";
import { useAui } from "@assistant-ui/store";
import type { AssistantContextConfig } from "../..";

export type { AssistantContextConfig };

export const useAssistantContext = (config: AssistantContextConfig) => {
  const { getContext, disabled = false } = config;
  const aui = useAui();
  const getContextRef = useRef(getContext);
  useInsertionEffect(() => {
    getContextRef.current = getContext;
  }, [getContext]);

  useEffect(() => {
    if (disabled) return;

    return aui.modelContext.register({
      getModelContext: () => ({
        system: getContextRef.current(),
      }),
    });
  }, [aui, disabled]);
};
