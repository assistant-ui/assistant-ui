import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuggestionDescription } from "./SuggestionDescription";

const h = vi.hoisted(() => ({
  suggestion: { label: "" as string | undefined },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(selector: (s: { suggestion: typeof h.suggestion }) => T) =>
    selector({ suggestion: h.suggestion }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("SuggestionDescription", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.suggestion.label = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const mount = async (
    props: Partial<Parameters<typeof SuggestionDescription>[0]> = {},
  ) => {
    await act(async () => {
      root.render(<SuggestionDescription testID="t" {...props} />);
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  it("renders the store suggestion label", async () => {
    h.suggestion.label = "Generate a quick summary";
    const el = await mount();
    expect(el.textContent).toBe("Generate a quick summary");
  });

  it("renders explicit children over the store label", async () => {
    h.suggestion.label = "Generate a quick summary";
    const el = await mount({ children: "Custom label" });
    expect(el.textContent).toBe("Custom label");
  });

  it("falls back to the store label when children is undefined", async () => {
    h.suggestion.label = "Store label";
    const el = await mount({ children: undefined });
    expect(el.textContent).toBe("Store label");
  });
});
