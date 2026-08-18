import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { ComposerQuote } from "./ComposerQuote";
import { ComposerQuoteDismiss } from "./ComposerQuoteDismiss";
import { ComposerQuoteText } from "./ComposerQuoteText";

const h = vi.hoisted(() => ({
  quote: undefined as { text: string } | undefined,
  setQuote: vi.fn<(quote: undefined) => void>(),
}));

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({ composer: { setQuote: h.setQuote } }),
  useAuiState: <T,>(selector: (state: { composer: typeof h }) => T) =>
    selector({ composer: h }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("Composer quote primitives", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.quote = undefined;
    h.setQuote.mockReset();
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

  const render = async (element: React.ReactElement) => {
    await act(async () => {
      root.render(element);
    });
  };

  it("renders quote children only when a quote exists", async () => {
    await render(
      <ComposerQuote>
        <Text testID="quote">quoted</Text>
      </ComposerQuote>,
    );
    expect(container.querySelector('[data-testid="quote"]')).toBeNull();

    h.quote = { text: "quoted text" };
    await render(
      <ComposerQuote>
        <Text testID="quote">quoted</Text>
      </ComposerQuote>,
    );
    expect(container.querySelector('[data-testid="quote"]')).not.toBeNull();
  });

  it("renders quote text and allows children to override it", async () => {
    h.quote = { text: "quoted text" };
    await render(<ComposerQuoteText testID="text" />);
    expect(container.querySelector('[data-testid="text"]')?.textContent).toBe(
      "quoted text",
    );

    await render(
      <ComposerQuoteText testID="text">
        <Text>override</Text>
      </ComposerQuoteText>,
    );
    expect(container.querySelector('[data-testid="text"]')?.textContent).toBe(
      "override",
    );
  });

  it("clears the quote when dismissed", async () => {
    await render(
      <ComposerQuoteDismiss testID="dismiss">
        <Text>dismiss</Text>
      </ComposerQuoteDismiss>,
    );
    const dismiss = container.querySelector('[data-testid="dismiss"]');
    expect(dismiss).not.toBeNull();

    await act(async () => {
      dismiss!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    expect(h.setQuote).toHaveBeenCalledWith(undefined);
  });
});
