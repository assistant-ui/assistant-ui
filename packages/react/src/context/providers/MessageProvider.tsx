"use client";

import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider } from "@assistant-ui/store";
import {
  type ThreadMessageClientProps,
  ThreadMessageClient,
} from "@assistant-ui/core/store";

export const MessageProvider: FC<
  PropsWithChildren<ThreadMessageClientProps>
> = ({ children, ...props }) => {
  const aui = useAui();
  const config = AuiConfig({ message: ThreadMessageClient(props) });
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};
