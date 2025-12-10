"use client";

import { type FC, type PropsWithChildren } from "react";
import {
  useAssistantClient,
  AssistantProvider,
  Derived,
} from "@assistant-ui/store";

export const MessageAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAssistantClient({
    attachment: Derived({
      source: "message",
      query: { type: "index", index },
      get: (aui) => aui.message().attachment({ index }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};

export const ComposerAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAssistantClient({
    attachment: Derived({
      source: "composer",
      query: { type: "index", index },
      get: (aui) => aui.composer().attachment({ index }),
    }),
  });

  return <AssistantProvider client={aui}>{children}</AssistantProvider>;
};
