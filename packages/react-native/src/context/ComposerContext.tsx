import type { ReactNode } from "react";
import type { ThreadComposerRuntime } from "@assistant-ui/core";
import { useAui } from "@assistant-ui/store";

/**
 * @deprecated Use useAuiState(s => s.composer) instead.
 */
export const useComposerRuntime = (): ThreadComposerRuntime => {
  const aui = useAui();
  const runtime = aui
    .threads()
    .thread("main")
    .composer()
    .__internal_getRuntime?.();
  if (!runtime) {
    throw new Error(
      "useComposerRuntime must be used within an AssistantProvider",
    );
  }
  return runtime as ThreadComposerRuntime;
};

/**
 * @deprecated Use the store system with AuiProvider for composer scoping.
 */
export const ComposerProvider = ({
  children,
}: {
  runtime: ThreadComposerRuntime;
  children: ReactNode;
}) => {
  return <>{children}</>;
};
