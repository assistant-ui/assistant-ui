import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { MarkdownTextPrimitiveProps } from "@assistant-ui/react-markdown";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  components: undefined as MarkdownTextPrimitiveProps["components"],
  messagePartText: {
    type: "text",
    text: "```tsx\nconst answer = 42;\n```",
    status: { type: "complete" },
  },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...original,
    useMessagePartText: () => mocks.messagePartText,
    INTERNAL: {
      ...original.INTERNAL,
      useSmooth: (part: { text: string }) => part,
      useSmoothStatus: () => ({ type: "complete" }),
      withSmoothContextProvider: (component: ComponentType) => component,
    },
  };
});

vi.mock("@assistant-ui/react-markdown", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@assistant-ui/react-markdown")>();
  return {
    ...original,
    MarkdownTextPrimitive: (props: MarkdownTextPrimitiveProps) => {
      mocks.components = props.components;
      return <original.MarkdownTextPrimitive {...props} />;
    },
  };
});

import { MarkdownText } from "./markdown-text";
// Minimal's Markdown override bypasses template sync, so its inline copy hook is covered here.
import { MarkdownText as MinimalMarkdownText } from "../../../../../../../templates/minimal/components/assistant-ui/elements/markdown-text";

afterEach(() => {
  cleanup();
  mocks.components = undefined;
  vi.useRealTimers();
});

describe.each([
  ["shared", MarkdownText],
  ["minimal template", MinimalMarkdownText],
] as const)("%s markdown copy feedback", (_name, Component) => {
  const mockClipboard = (writeText: () => Promise<void>) => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    onTestFinished(() => {
      if (descriptor) Object.defineProperty(navigator, "clipboard", descriptor);
      else delete (navigator as { clipboard?: unknown }).clipboard;
    });
  };

  it("resets feedback when another pending copy succeeds", async () => {
    vi.useFakeTimers();
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<void>((resolve) => {
      resolveSecond = resolve;
    });
    mockClipboard(
      vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second),
    );
    render(<Component />);
    const button = screen.getByRole("button", { name: "Copy" });
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => {
      resolveFirst();
      await first;
    });
    act(() => vi.advanceTimersByTime(1000));
    await act(async () => {
      resolveSecond();
      await second;
    });
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(button.querySelector(".lucide-check")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(button.querySelector(".lucide-check")).toBeNull();
  });

  it("clears active feedback on unmount", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    const view = render(<Component />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await act(async () => Promise.resolve());
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule feedback for a write finishing after unmount", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const write = new Promise<void>((resolve) => {
      finish = resolve;
    });
    mockClipboard(() => write);
    const view = render(<Component />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    view.unmount();
    await act(async () => {
      finish();
      await write;
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("MarkdownText component overrides", () => {
  it("memoizes a syntax highlighter override while keeping the kit code header", () => {
    const SyntaxHighlighter = vi.fn(({ code }: { code: string }) => (
      <div data-testid="syntax-highlighter">{code}</div>
    ));

    render(<MarkdownText components={{ SyntaxHighlighter }} />);

    expect(screen.getByTestId("syntax-highlighter").textContent).toBe(
      "const answer = 42;\n",
    );
    expect(
      screen.getByText("tsx").closest(".aui-code-header-root"),
    ).not.toBeNull();
    expect(SyntaxHighlighter).toHaveBeenCalledOnce();
    expect(mocks.components?.SyntaxHighlighter).not.toBe(SyntaxHighlighter);
  });

  it("keeps the composed map referentially stable across equal inline overrides", () => {
    const SyntaxHighlighter = ({ code }: { code: string }) => (
      <div data-testid="syntax-highlighter">{code}</div>
    );

    const { rerender } = render(
      <MarkdownText components={{ SyntaxHighlighter }} />,
    );
    const first = mocks.components;
    rerender(<MarkdownText components={{ SyntaxHighlighter }} />);

    expect(mocks.components).toBe(first);
  });

  it("keeps the default html renderers in the composed map with overrides", () => {
    const SyntaxHighlighter = ({ code }: { code: string }) => (
      <div data-testid="syntax-highlighter">{code}</div>
    );

    render(<MarkdownText components={{ SyntaxHighlighter }} />);

    expect(mocks.components?.h1).toBeDefined();
    expect(mocks.components?.p).toBeDefined();
  });

  it("renders the default map with kit classes when no overrides are given", () => {
    mocks.messagePartText.text = "# Heading\n\nparagraph";
    try {
      render(<MarkdownText />);

      const heading = screen.getByText("Heading");
      expect(heading.closest(".aui-md-h1")).not.toBeNull();
      expect(screen.getByText("paragraph").closest(".aui-md-p")).not.toBeNull();
    } finally {
      mocks.messagePartText.text = "```tsx\nconst answer = 42;\n```";
    }
  });

  it("gives a table its own horizontal scroll container", () => {
    mocks.messagePartText.text =
      "| ID |\n| --- |\n| aaaa0000bbbb1111cccc2222dddd3333 |";
    try {
      render(<MarkdownText />);

      const table = screen.getByRole("table");
      const wrapper = table.parentElement;

      expect(wrapper?.classList.contains("aui-md-table-wrapper")).toBe(true);
      expect(wrapper?.classList.contains("overflow-x-auto")).toBe(true);
      expect(table.classList.contains("aui-md-table")).toBe(true);
      expect(table.className).not.toContain("overflow");
    } finally {
      mocks.messagePartText.text = "```tsx\nconst answer = 42;\n```";
    }
  });
});
