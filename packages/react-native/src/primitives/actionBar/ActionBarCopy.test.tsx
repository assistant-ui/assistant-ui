import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionBarCopy } from "./ActionBarCopy";

const h = vi.hoisted(() => ({
  options: undefined as
    | { copyToClipboard?: (text: string) => void | Promise<void> }
    | undefined,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    useActionBarCopy: (options: {
      copyToClipboard?: (text: string) => void | Promise<void>;
    }) => {
      h.options = options;
      return { copy: vi.fn(), disabled: false, isCopied: false };
    },
  };
});

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  return {
    ...actual,
    Pressable: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => <button {...props}>{children}</button>,
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ActionBarCopy", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.options = undefined;
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

  it("supplies a clipboard writer when the caller omits copyToClipboard", async () => {
    await act(async () => {
      root.render(<ActionBarCopy>Copy</ActionBarCopy>);
    });
    expect(typeof h.options?.copyToClipboard).toBe("function");
  });

  it("keeps a caller-supplied clipboard writer", async () => {
    const copyToClipboard = vi.fn();
    await act(async () => {
      root.render(
        <ActionBarCopy copyToClipboard={copyToClipboard}>Copy</ActionBarCopy>,
      );
    });
    expect(h.options?.copyToClipboard).toBe(copyToClipboard);
  });
});
