import { type ReactNode, memo } from "react";
import { type AssistantClient } from "@assistant-ui/store";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";
import { AssistantProviderBase } from "./AssistantProvider";

export const AssistantRuntimeProvider = memo(
  ({
    runtime,
    aui,
    children,
  }: {
    runtime: AssistantRuntime;
    aui?: AssistantClient | null;
    children: ReactNode;
  }) => {
    return (
      <AssistantProviderBase runtime={runtime} aui={aui ?? null}>
        {children}
      </AssistantProviderBase>
    );
  },
);
