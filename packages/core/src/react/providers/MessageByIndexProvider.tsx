import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const config = AuiConfig({
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
  });
  return <AuiProvider config={config}>{children}</AuiProvider>;
};
