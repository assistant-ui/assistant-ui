import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";

const setQuote = vi.fn();

const mockUseAui = vi.fn(() => ({
  composer: () => ({ setQuote }),
}));
const mockUseAuiState = vi.fn();

type InputHandler = (
  input: string,
  key: { return?: boolean; ctrl?: boolean; shift?: boolean; meta?: boolean },
) => void;

let inputHandlers: InputHandler[] = [];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => mockUseAui(),
    useAuiState: (selector: (s: unknown) => unknown) =>
      mockUseAuiState(selector),
  };
});

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: true }),
    useInput: (handler: InputHandler, opts?: { isActive?: boolean }) => {
      if (opts?.isActive !== false) inputHandlers.push(handler);
    },
  };
});

import { ComposerQuote } from "../primitives/composer/ComposerQuote";
import { ComposerQuoteText } from "../primitives/composer/ComposerQuoteText";
import { ComposerQuoteDismiss } from "../primitives/composer/ComposerQuoteDismiss";

const pressEnter = () => {
  for (const handler of inputHandlers) handler("", { return: true });
};

const stateWithQuote = (text: string | undefined) => ({
  composer: { quote: text === undefined ? undefined : { text } },
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  inputHandlers = [];
});

describe("ComposerPrimitive.Quote", () => {
  it("renders nothing when no quote is set", () => {
    mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(stateWithQuote(undefined)),
    );
    const { lastFrame } = render(
      <ComposerQuote>
        <Text>inner</Text>
      </ComposerQuote>,
    );
    expect(lastFrame()).not.toContain("inner");
  });

  it("renders children when a quote is set", () => {
    mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(stateWithQuote("hello")),
    );
    const { lastFrame } = render(
      <ComposerQuote>
        <Text>inner</Text>
      </ComposerQuote>,
    );
    expect(lastFrame()).toContain("inner");
  });
});

describe("ComposerPrimitive.QuoteText", () => {
  it("renders the quote text from state", () => {
    mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(stateWithQuote("quoted body")),
    );
    const { lastFrame } = render(<ComposerQuoteText />);
    expect(lastFrame()).toContain("quoted body");
  });

  it("renders children when provided (override)", () => {
    mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(stateWithQuote("quoted body")),
    );
    const { lastFrame } = render(
      <ComposerQuoteText>override</ComposerQuoteText>,
    );
    expect(lastFrame()).toContain("override");
    expect(lastFrame()).not.toContain("quoted body");
  });

  it("renders nothing when there is no quote text, even with children", () => {
    mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(stateWithQuote(undefined)),
    );
    const { lastFrame } = render(
      <ComposerQuoteText>fallback</ComposerQuoteText>,
    );
    expect(lastFrame()?.trim() ?? "").toBe("");
  });

  it("renders children override when quote text is an empty string", () => {
    mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(stateWithQuote("")),
    );
    const { lastFrame } = render(
      <ComposerQuoteText>override</ComposerQuoteText>,
    );
    expect(lastFrame()).toContain("override");
  });

  it("renders an empty Text when quote text is an empty string and no children are provided", () => {
    mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(stateWithQuote("")),
    );
    const { lastFrame } = render(<ComposerQuoteText />);
    expect(lastFrame()?.trim() ?? "").toBe("");
  });

  it("forwards Ink Text props", () => {
    mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(stateWithQuote("colored")),
    );
    const { lastFrame } = render(<ComposerQuoteText color="cyan" />);
    expect(lastFrame()).toContain("colored");
  });
});

describe("ComposerPrimitive.QuoteDismiss", () => {
  it("calls aui.composer().setQuote(undefined) on Enter", () => {
    render(
      <ComposerQuoteDismiss>
        <Text>[x]</Text>
      </ComposerQuoteDismiss>,
    );
    pressEnter();
    expect(setQuote).toHaveBeenCalledTimes(1);
    expect(setQuote).toHaveBeenCalledWith(undefined);
  });

  it("does not call setQuote when disabled", () => {
    render(
      <ComposerQuoteDismiss disabled>
        <Text>[x]</Text>
      </ComposerQuoteDismiss>,
    );
    pressEnter();
    expect(setQuote).not.toHaveBeenCalled();
  });
});
