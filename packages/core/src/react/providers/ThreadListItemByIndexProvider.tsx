import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const ThreadListItemByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
    archived: boolean;
  }>
> = ({ index, archived, children }) => (
  <AuiProvider
    config={AuiConfig({
      threadListItem: Derived({
        source: "threads",
        query: { type: "index", index, archived },
        get: (aui) => aui.threads.item({ index, archived }),
      }),
    })}
  >
    {children}
  </AuiProvider>
);
