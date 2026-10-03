import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { CodeBlock as BaseCodeBlock } from "./base/code-block";
import { CommandTabs as BaseCommandTabs } from "./base/command-tabs";
import { CodeBlock as RadixCodeBlock } from "./radix/code-block";
import { CommandTabs as RadixCommandTabs } from "./radix/command-tabs";

const mocks = vi.hoisted(() => ({
  useShikiHighlighter: vi.fn(() => null),
}));

vi.mock("react-shiki", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-shiki")>();
  return {
    ...original,
    useShikiHighlighter: mocks.useShikiHighlighter,
  };
});

const mockClipboard = (writeText: (value: string) => Promise<void>) => {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
  onTestFinished(() => {
    if (descriptor) {
      Object.defineProperty(navigator, "clipboard", descriptor);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });
};

afterEach(() => {
  vi.useRealTimers();
});

describe.each([
  ["Base", BaseCodeBlock],
  ["Radix", RadixCodeBlock],
] as const)("%s CodeBlock copy feedback", (_name, CodeBlock) => {
  it("keeps feedback visible for a full interval after a second success", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    const view = render(
      <CodeBlock title="Example">
        <pre>value</pre>
      </CodeBlock>,
    );
    const button = screen.getByRole("button", { name: "Copy code" });

    fireEvent.click(button);
    await act(async () => Promise.resolve());
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(button);
    await act(async () => Promise.resolve());
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(500));
    expect(button.querySelector(".lucide-check")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(button.querySelector(".lucide-check")).toBeNull();
    view.unmount();
  });

  it("preserves an earlier successful write after a newer rejection", async () => {
    vi.useFakeTimers();
    let resolveFirst!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    mockClipboard(
      vi
        .fn()
        .mockReturnValueOnce(firstWrite)
        .mockRejectedValueOnce(new Error("denied")),
    );
    const onCopied = vi.fn();
    const view = render(
      <CodeBlock title="Example" onCopied={onCopied}>
        <pre>value</pre>
      </CodeBlock>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await act(async () => Promise.resolve());
    resolveFirst();
    await act(async () => firstWrite);

    expect(onCopied).toHaveBeenCalledOnce();
    expect(
      screen
        .getByRole("button", { name: "Copy code" })
        .querySelector(".lucide-check"),
    ).not.toBeNull();
    view.unmount();
  });

  it("does not schedule feedback when onCopied unmounts the component", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    let view!: ReturnType<typeof render>;
    const onCopied = vi.fn(() => view.unmount());
    view = render(
      <CodeBlock title="Example" onCopied={onCopied}>
        <pre>value</pre>
      </CodeBlock>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await act(async () => Promise.resolve());

    expect(onCopied).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("calls onCopied when a pending write finishes after unmount", async () => {
    vi.useFakeTimers();
    let resolveWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    mockClipboard(() => write);
    const onCopied = vi.fn();
    const view = render(
      <CodeBlock title="Example" onCopied={onCopied}>
        <pre>value</pre>
      </CodeBlock>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    view.unmount();
    await act(async () => {
      resolveWrite();
      await write;
    });

    expect(onCopied).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe.each([
  ["Base", BaseCommandTabs],
  ["Radix", RadixCommandTabs],
] as const)("%s CommandTabs copy feedback", (_name, CommandTabs) => {
  it("keeps feedback visible for a full interval after a second success", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    const view = render(<CommandTabs commands={{ npm: "npm install" }} />);
    const button = screen.getByRole("button", { name: "Copy command" });

    fireEvent.click(button);
    await act(async () => Promise.resolve());
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(button);
    await act(async () => Promise.resolve());
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(500));
    expect(button.querySelector(".lucide-check")).not.toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(button.querySelector(".lucide-check")).toBeNull();
    view.unmount();
  });

  it("clears an active feedback timer when unmounted", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    const view = render(<CommandTabs commands={{ npm: "npm install" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    await act(async () => Promise.resolve());
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a pending write after unmount", async () => {
    vi.useFakeTimers();
    let resolveWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    mockClipboard(() => write);
    const view = render(<CommandTabs commands={{ npm: "npm install" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    view.unmount();
    resolveWrite();
    await write;

    expect(vi.getTimerCount()).toBe(0);
  });
});
