import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export type QueueItemByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

export const QueueItemByIndexProvider: FC<QueueItemByIndexProviderProps> = ({
  index,
  children,
}) => {
  const aui = useAui();
  const config = AuiConfig({
    queueItem: Derived({
      source: "composer",
      query: { type: "index", index },
      get: (aui) => aui.composer.queueItem({ index }),
    }),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};
