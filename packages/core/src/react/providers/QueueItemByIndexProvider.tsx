import { type FC, type PropsWithChildren } from "react";
import { AuiProvider, Derived, useAui } from "@assistant-ui/store";

export type QueueItemByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

export const QueueItemByIndexProvider: FC<QueueItemByIndexProviderProps> = ({
  index,
  children,
}) => {
  const aui = useAui({
    queueItem: Derived({
      source: "composer",
      query: { index },
      get: (aui) => aui.composer().queueItem({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
