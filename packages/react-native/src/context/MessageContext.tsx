import type { ReactNode } from "react";
import type { MessageRuntime } from "@assistant-ui/core";
import { useAui } from "@assistant-ui/store";

/**
 * @deprecated Use useAuiState(s => s.message) instead.
 */
export const useMessageRuntime = (): MessageRuntime => {
  const aui = useAui();
  const runtime = aui.message().__internal_getRuntime?.();
  if (!runtime) {
    throw new Error(
      "useMessageRuntime must be used within a message scope (e.g. ThreadMessages)",
    );
  }
  return runtime as MessageRuntime;
};

/**
 * @deprecated Use the store system with AuiProvider for message scoping.
 */
export const MessageProvider = ({
  children,
}: {
  runtime: MessageRuntime;
  children: ReactNode;
}) => {
  return <>{children}</>;
};
