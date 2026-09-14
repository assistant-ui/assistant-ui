import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownText } from "./markdown-text";

const h = vi.hoisted(() => ({
  setClipboardString: vi.fn(),
}));

vi.mock("react-native-marked", async () => {
  const React = await import("react");
  const { Text } = await import("react-native");
  let keys = 0;
  class Renderer {
    getKey() {
      keys += 1;
      return `marked-${keys}`;
    }
    code(_text: string, _language?: string): unknown {
      return null;
    }
  }
  const MarkedLexer = (text: string) =>
    text
      .split(/\n{2,}/)
      .filter((raw) => raw.trim().length > 0)
      .map((raw) => ({
        type: raw.startsWith("```") ? "code" : "paragraph",
        raw,
      }));
  const useMarkdown = (raw: string, options: { renderer: Renderer }) => {
    const fences = [...raw.matchAll(/```([^\n]*)\n([\s\S]*?)\n\s*```/g)];
    if (fences.length > 0)
      return fences.map((fence) =>
        options.renderer.code(fence[2] ?? "", fence[1]?.trim() || undefined),
      );
    return [React.createElement(Text, { key: "text" }, raw)];
  };
  return { MarkedLexer, Renderer, useMarkdown };
});

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: (names: string | string[]) =>
    Array.isArray(names) ? names.map(() => undefined) : undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  const icon = (name: string) => () =>
    React.createElement(View, { testID: name });

  return { CheckIcon: icon("CheckIcon"), CopyIcon: icon("CopyIcon") };
});

vi.mock("expo-clipboard", () => ({ setStringAsync: h.setClipboardString }));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("MarkdownText", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.setClipboardString.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const render = async (text: string) => {
    await act(async () => {
      root.render(
        <MarkdownText text={text} type="text" status={{ type: "complete" }} />,
      );
    });
  };

  it("renders each top-level block and a code block with its language", async () => {
    await render(
      "# Title\n\nSome **bold** text.\n\n- first\n- second\n\n```ts\nconst answer = 42;\n```\n",
    );

    expect(container.textContent).toContain("# Title");
    expect(container.textContent).toContain("Some **bold** text.");
    expect(container.textContent).toContain("- first\n- second");
    expect(container.textContent).toContain("ts");
    expect(container.textContent).toContain("const answer = 42;");
    expect(container.querySelectorAll('[aria-label="Copy code"]')).toHaveLength(
      1,
    );
  });

  it("copies a code block", async () => {
    await render("```js\nconsole.log(1);\n```\n");

    const button = container.querySelector('[aria-label="Copy code"]');
    expect(button).not.toBeNull();
    await act(async () => {
      click(button as Element);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(h.setClipboardString).toHaveBeenCalledWith("console.log(1);");
    expect(container.querySelector('[data-testid="CheckIcon"]')).not.toBeNull();
  });

  it("keys sibling code blocks apart and keeps them stable across re-parses", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const block =
      "1. build it:\n   ```sh\n   pnpm build\n   ```\n   then run it:\n   ```sh\n   pnpm start\n   ```";

    await render(block);
    await render(`${block}\n   done`);

    expect(container.querySelectorAll('[aria-label="Copy code"]')).toHaveLength(
      2,
    );
    expect(container.textContent).toContain("pnpm build");
    expect(container.textContent).toContain("pnpm start");
    expect(
      errors.mock.calls.some((call) => String(call[0]).includes("same key")),
    ).toBe(false);
    errors.mockRestore();
  });

  it("throttles streamed text and renders the completed blocks", async () => {
    vi.useFakeTimers();
    await render("Hello **wor");
    expect(container.textContent).toContain("Hello");

    await render("Hello **world**\n\nSecond paragraph");
    expect(container.textContent).not.toContain("Second paragraph");

    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    expect(container.textContent).toContain("world");
    expect(container.textContent).toContain("Second paragraph");
  });
});
