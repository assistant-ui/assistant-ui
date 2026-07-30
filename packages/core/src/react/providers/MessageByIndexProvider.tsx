import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => (
  <AuiProvider
    config={AuiConfig({
      message: Derived({
        source: "thread",
        query: { type: "index", index },
        get: (aui) => aui.thread.message({ index }),
      }),
      composer: Derived({
        source: "message",
        query: {},
        get: (aui) => aui.thread.message({ index }).composer(),
      }),
    })}
  >
    {children}
  </AuiProvider>
);
