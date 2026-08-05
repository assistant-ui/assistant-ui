import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export type SuggestionByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

export const SuggestionByIndexProvider: FC<SuggestionByIndexProviderProps> = ({
  index,
  children,
}) => {
  const aui = useAui();
  const config = AuiConfig({
    suggestion: Derived({
      source: "suggestions",
      query: { index },
      get: (aui) => aui.suggestions.suggestion({ index }),
    }),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};
