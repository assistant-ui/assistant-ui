import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export type QueueItemByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

export const QueueItemByIndexProvider: FC<QueueItemByIndexProviderProps> = ({
  index,
  children,
}) => (
  <AuiProvider
    config={AuiConfig({
      queueItem: Derived({
        source: "composer",
        query: { index },
        get: (aui) => aui.composer.queueItem({ index }),
      }),
    })}
  >
    {children}
  </AuiProvider>
);
