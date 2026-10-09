import type { ReactNode } from "react";
import { useAuiState } from "@assistant-ui/store";

export type ThreadIfProps = {
  children: ReactNode;
  empty?: boolean | undefined;
  running?: boolean | undefined;
};

/**
 * @deprecated Use `<AuiIf condition={(s) => s.thread...} />` instead.
 */
export const ThreadIf = ({ children, empty, running }: ThreadIfProps) => {
  const thread = useAuiState((s) => s.thread);

  if (empty !== undefined && empty !== thread.isEmpty) return null;
  if (running !== undefined && running !== thread.isRunning) return null;

  return <>{children}</>;
};
