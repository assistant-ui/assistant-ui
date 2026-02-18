"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";
import type { ThreadListItemRuntime } from "../../legacy-runtime/runtime/ThreadListItemRuntime";
import { ThreadListItemClient } from "@assistant-ui/core/store/internal";

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

export const ThreadListItemRuntimeProvider: FC<
  PropsWithChildren<{
    runtime: ThreadListItemRuntime;
  }>
> = ({ runtime, children }) => {
  const aui = useAui({
    threadListItem: ThreadListItemClient({ runtime }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
