import type { ReactNode } from "react";
import { useThreadIf } from "@assistant-ui/core/react";

export type ThreadIfProps = {
  children: ReactNode;
  empty?: boolean | undefined;
  running?: boolean | undefined;
  disabled?: boolean | undefined;
};

export const ThreadIf = ({ children, ...query }: ThreadIfProps) => {
  const result = useThreadIf(query);
  if (!result) return null;
  return <>{children}</>;
};
