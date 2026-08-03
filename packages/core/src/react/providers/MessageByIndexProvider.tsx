import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAui();
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
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};
