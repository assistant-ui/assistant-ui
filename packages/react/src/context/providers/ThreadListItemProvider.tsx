"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const ThreadListItemByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
    archived: boolean;
  }>
> = ({ index, archived, children }) => {
  const aui = useAui({
    threadListItem: Derived({
      source: "threads",
      query: { type: "index", index, archived },
      get: (aui) => aui.threads().item({ index, archived }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

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
