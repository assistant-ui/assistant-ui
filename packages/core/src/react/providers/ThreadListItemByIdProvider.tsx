import type { FC, PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const ThreadListItemByIdProvider: FC<
  PropsWithChildren<{
    id: string;
  }>
> = ({ id, children }) => {
  const aui = useAui({
    threadListItem: Derived({
      source: "threads",
      query: { type: "id", id },
      get: (aui) => aui.threads().item({ id }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
