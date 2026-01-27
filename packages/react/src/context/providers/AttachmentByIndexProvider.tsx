"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const MessageAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAui({
    attachment: Derived({
      source: "message",
      query: { type: "index", index },
      get: (aui) => aui.message().attachment({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

export const ComposerAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAui({
    attachment: Derived({
      source: "composer",
      query: { type: "index", index },
      get: (aui) => aui.composer().attachment({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
