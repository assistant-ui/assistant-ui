import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { SuggestionTitle } from "./SuggestionTitle";

const h = vi.hoisted(() => ({
  suggestion: { title: "" as string | undefined },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(selector: (s: { suggestion: typeof h.suggestion }) => T) =>
    selector({ suggestion: h.suggestion }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("SuggestionTitle", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.suggestion.title = "";
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
    props: Partial<Parameters<typeof SuggestionTitle>[0]> = {},
  ) => {
    await act(async () => {
      root.render(<SuggestionTitle testID="t" {...props} />);
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  it("renders the store suggestion title", async () => {
    h.suggestion.title = "Summarize this";
    const el = await mount();
    expect(el.textContent).toBe("Summarize this");
  });

  it("renders explicit children over the store title", async () => {
    h.suggestion.title = "Summarize this";
    const el = await mount({ children: "Custom title" });
    expect(el.textContent).toBe("Custom title");
  });

  it("falls back to the store title when children is undefined", async () => {
    h.suggestion.title = "Store title";
    const el = await mount({ children: undefined });
    expect(el.textContent).toBe("Store title");
  });
});
