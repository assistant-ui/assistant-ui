import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const MessageAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => (
  <AuiProvider
    config={AuiConfig({
      attachment: Derived({
        source: "message",
        query: { type: "index", index },
        get: (aui) => aui.message.attachment({ index }),
      }),
    })}
  >
    {children}
  </AuiProvider>
);

export const ComposerAttachmentByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => (
  <AuiProvider
    config={AuiConfig({
      attachment: Derived({
        source: "composer",
        query: { type: "index", index },
        get: (aui) => aui.composer.attachment({ index }),
      }),
    })}
  >
    {children}
  </AuiProvider>
);
