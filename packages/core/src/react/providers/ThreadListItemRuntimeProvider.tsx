import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";
import type { ThreadListItemRuntime } from "../..";
import { ThreadListItemClient } from "../../store/internal";

export const ThreadListItemRuntimeProvider: FC<
  PropsWithChildren<{
    runtime: ThreadListItemRuntime;
  }>
> = ({ runtime, children }) => (
  <AuiProvider
    config={AuiConfig({ threadListItem: ThreadListItemClient({ runtime }) })}
  >
    {children}
  </AuiProvider>
);
