import { act, type ReactElement } from "react";
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

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => ({ composer: { setQuote: h.setQuote } }),
    useAuiState: <T,>(selector: (state: { composer: typeof h }) => T) =>
      selector({ composer: h }),
  };
});

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

  const render = async (element: ReactElement) => {
    await act(async () => {
      root.render(element);
    });
  };

  const press = async (testID: string) => {
    const element = container.querySelector(`[data-testid="${testID}"]`);
    expect(element).not.toBeNull();
    await act(async () => {
      element!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
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

  it("renders nothing when there is no quote text, even with children", async () => {
    await render(
      <ComposerQuoteText testID="text">
        <Text>fallback</Text>
      </ComposerQuoteText>,
    );
    expect(container.querySelector('[data-testid="text"]')).toBeNull();
  });

  it("renders children override when quote text is an empty string", async () => {
    h.quote = { text: "" };
    await render(
      <ComposerQuoteText testID="text">
        <Text>override</Text>
      </ComposerQuoteText>,
    );
    expect(container.querySelector('[data-testid="text"]')?.textContent).toBe(
      "override",
    );
  });

  it("renders an empty Text when quote text is an empty string and no children are provided", async () => {
    h.quote = { text: "" };
    await render(<ComposerQuoteText testID="text" />);
    expect(container.querySelector('[data-testid="text"]')?.textContent).toBe(
      "",
    );
  });

  it("clears the quote when dismissed", async () => {
    await render(
      <ComposerQuoteDismiss testID="dismiss">
        <Text>dismiss</Text>
      </ComposerQuoteDismiss>,
    );
    await press("dismiss");
    expect(h.setQuote).toHaveBeenCalledWith(undefined);
  });

  it("does not clear the quote when dismiss is disabled", async () => {
    await render(
      <ComposerQuoteDismiss testID="dismiss" disabled>
        <Text>dismiss</Text>
      </ComposerQuoteDismiss>,
    );
    await press("dismiss");
    expect(h.setQuote).not.toHaveBeenCalled();
  });

  it("passes the Pressable press state to function children", async () => {
    await render(
      <ComposerQuoteDismiss testID="dismiss">
        {({ pressed }) => (pressed ? "pressed" : "idle")}
      </ComposerQuoteDismiss>,
    );
    expect(
      container.querySelector('[data-testid="dismiss"]')?.textContent,
    ).toBe("idle");

    await render(
      <ComposerQuoteDismiss testID="dismiss" testOnly_pressed>
        {({ pressed }) => (pressed ? "pressed" : "idle")}
      </ComposerQuoteDismiss>,
    );
    expect(
      container.querySelector('[data-testid="dismiss"]')?.textContent,
    ).toBe("pressed");
  });
});
