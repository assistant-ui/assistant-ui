"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider } from "@assistant-ui/store";
import {
  type ThreadMessageClientProps,
  ThreadMessageClient,
} from "@assistant-ui/core/store";

export const MessageProvider: FC<
  PropsWithChildren<ThreadMessageClientProps>
> = ({ children, ...props }) => {
  const aui = useAui({
    message: ThreadMessageClient(props),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
