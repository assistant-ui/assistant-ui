import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const MessageByIdProvider: FC<
  PropsWithChildren<{
    id: string;
  }>
> = ({ id, children }) => {
  const config = AuiConfig({
    message: Derived({
      source: "thread",
      query: { type: "id", id },
      get: (aui) => aui.thread.message({ id }),
    }),
    composer: Derived({
      source: "message",
      query: {},
      get: (aui) => aui.thread.message({ id }).composer(),
    }),
  });
  return <AuiProvider config={config}>{children}</AuiProvider>;
};
