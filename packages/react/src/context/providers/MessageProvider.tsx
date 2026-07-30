"use client";

import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";
import {
  type ThreadMessageClientProps,
  ThreadMessageClient,
} from "@assistant-ui/core/store";

export const MessageProvider: FC<
  PropsWithChildren<ThreadMessageClientProps>
> = ({ children, ...props }) => {
  const config = AuiConfig({ message: ThreadMessageClient(props) });
  return <AuiProvider config={config}>{children}</AuiProvider>;
};
