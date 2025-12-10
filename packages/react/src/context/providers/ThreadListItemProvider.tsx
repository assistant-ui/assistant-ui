"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  useAssistantClient,
  AssistantProvider,
  Derived,
} from "@assistant-ui/store";

export const ThreadListItemByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
    archived: boolean;
  }>
> = ({ index, archived, children }) => {
  const aui = useAssistantClient({
    threadListItem: Derived({
      source: "threads",
      query: { type: "index", index, archived },
      get: (aui) => aui.threads().item({ index, archived }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};

export const ThreadListItemByIdProvider: FC<
  PropsWithChildren<{
    id: string;
  }>
> = ({ id, children }) => {
  const aui = useAssistantClient({
    threadListItem: Derived({
      source: "threads",
      query: { type: "id", id },
      get: (aui) => aui.threads().item({ id }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};
