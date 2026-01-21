"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider } from "@assistant-ui/store";
import {
  ThreadMessageClientProps,
  ThreadMessageClient,
} from "../../client/ThreadMessageClient";

export const MessageProvider: FC<
  PropsWithChildren<ThreadMessageClientProps>
> = ({ children, ...props }) => {
  const aui = useAui({
    message: ThreadMessageClient(props),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
