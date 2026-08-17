import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";
import { ComposerInputPluginProvider } from "../primitives/composer/ComposerInputPluginContext";

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
  // Fresh registry per message scope: `composer` re-binds to the edit composer
  // here, so composer-input plugins must not leak across the same boundary.
  return (
    <AuiProvider extends={aui} config={config}>
      <ComposerInputPluginProvider>{children}</ComposerInputPluginProvider>
    </AuiProvider>
  );
};
