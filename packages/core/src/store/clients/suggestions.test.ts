import { useState } from "react";
import { createTapRoot, flushTapSync, useResource } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import { Suggestions, type SuggestionConfig } from "./suggestions";

describe("Suggestions", () => {
  it("updates when the configured suggestions change", () => {
    let setSuggestions!: (suggestions: SuggestionConfig[]) => void;
    const root = createTapRoot(function SuggestionsRoot() {
      const [suggestions, setValue] = useState<SuggestionConfig[]>([
        "account-a",
      ]);
      setSuggestions = setValue;
      return useResource(Suggestions(suggestions));
    });

    try {
      expect(root.getValue().getState().suggestions[0]?.prompt).toBe(
        "account-a",
      );

      flushTapSync(() => setSuggestions(["account-b"]));

      expect(root.getValue().getState().suggestions[0]?.prompt).toBe(
        "account-b",
      );
    } finally {
      root.unmount();
    }
  });
});
