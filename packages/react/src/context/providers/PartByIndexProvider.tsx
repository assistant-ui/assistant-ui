"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  useAssistantClient,
  AssistantProvider,
  Derived,
} from "@assistant-ui/store";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAssistantClient({
    part: Derived({
      source: "message",
      query: { type: "index", index },
      get: (aui) => aui.message().part({ index }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};
