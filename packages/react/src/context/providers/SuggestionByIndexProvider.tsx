"use client";

import { type FC, type PropsWithChildren } from "react";
import { AuiProvider, Derived, useAui } from "@assistant-ui/store";

export type SuggestionByIndexProviderProps = PropsWithChildren<{
  index: number;
}>;

export const SuggestionByIndexProvider: FC<SuggestionByIndexProviderProps> = ({
  index,
  children,
}) => {
  const aui = useAui({
    suggestion: Derived({
      source: "suggestions",
      query: { index },
      get: (aui) => aui.suggestions().suggestion({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
