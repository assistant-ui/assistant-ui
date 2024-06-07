"use client";

import type { FC, PropsWithChildren } from "react";
import { AssistantContext } from "../../utils/context/AssistantContext";
import type { ThreadRuntime } from "./ThreadRuntime";
import { useAssistantContext } from "./utils/useAssistantContext";

type AssistantProviderProps = {
  runtime: ThreadRuntime;
};

export const AssistantProvider: FC<PropsWithChildren<AssistantProviderProps>> =
  ({ children, runtime }) => {
    const context = useAssistantContext(runtime);

    return (
      <AssistantContext.Provider value={context}>
        {children}
      </AssistantContext.Provider>
    );
  };
