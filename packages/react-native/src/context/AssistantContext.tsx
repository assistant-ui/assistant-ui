import { createContext, useContext, type ReactNode } from "react";
import type { AssistantRuntime } from "@assistant-ui/core";

const AssistantContext = createContext<AssistantRuntime | null>(null);

export const useAssistantRuntime = (): AssistantRuntime => {
  const runtime = useContext(AssistantContext);
  if (!runtime) {
    throw new Error(
      "useAssistantRuntime must be used within an AssistantProvider",
    );
  }
  return runtime;
};

export const AssistantProvider = ({
  runtime,
  children,
}: {
  runtime: AssistantRuntime;
  children: ReactNode;
}) => {
  return (
    <AssistantContext.Provider value={runtime}>
      {children}
    </AssistantContext.Provider>
  );
};
