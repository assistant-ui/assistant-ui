import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider } from "@assistant-ui/store";
import type { ThreadListItemRuntime } from "../..";
import { ThreadListItemClient } from "../../store/internal";

export const ThreadListItemRuntimeProvider: FC<
  PropsWithChildren<{
    runtime: ThreadListItemRuntime;
  }>
> = ({ runtime, children }) => {
  const aui = useAui();
  const config = AuiConfig({
    threadListItem: ThreadListItemClient({ runtime }),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};
