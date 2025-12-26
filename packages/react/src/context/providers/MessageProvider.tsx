"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAssistantClient, AssistantProvider } from "@assistant-ui/store";
import {
  ThreadMessageClientProps,
  ThreadMessageClient,
} from "../../client/ThreadMessageClient";

export const MessageProvider: FC<
  PropsWithChildren<ThreadMessageClientProps>
> = ({ children, ...props }) => {
  const aui = useAssistantClient({
    message: ThreadMessageClient(props),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};
