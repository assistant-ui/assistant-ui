import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider } from "@assistant-ui/store";
import type { ThreadListItemRuntime } from "@assistant-ui/core";
import { ThreadListItemClient } from "@assistant-ui/core/store/internal";

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
