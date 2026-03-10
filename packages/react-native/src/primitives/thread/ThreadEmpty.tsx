import type { ReactNode } from "react";
import { useThreadIsEmpty } from "../../primitive-hooks/useThreadIsEmpty";

export type ThreadEmptyProps = {
  children: ReactNode;
};

export const ThreadEmpty = ({ children }: ThreadEmptyProps) => {
  const isEmpty = useThreadIsEmpty();
  if (!isEmpty) return null;
  return <>{children}</>;
};
