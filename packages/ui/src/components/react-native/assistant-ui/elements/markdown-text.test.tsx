/// <reference types="node" />

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { MarkdownText, rewriteMarkdownTaskListMarkers } from "./markdown-text";

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
  const { createRequire } = await import("node:module");
  const markedRequire = createRequire(
    createRequire(import.meta.url).resolve("react-native-marked/package.json"),
  );
  const { Lexer } = markedRequire("marked") as {
    Lexer: new (options: { gfm: boolean }) => { lex(text: string): unknown[] };
  };
  const MarkedLexer = (text: string, options: { gfm: boolean }) =>
    new Lexer(options).lex(text);
  const useMarkdown = (raw: string, options: { renderer: Renderer }) => {
    const fences = [...raw.matchAll(/```([^\n]*)\n([\s\S]*?)\n\s*```/g)];
    if (fences.length > 0)
      return [
        ...fences.map((fence) =>
          options.renderer.code(fence[2] ?? "", fence[1]?.trim() || undefined),
        ),
        ...(raw.replace(/```[^\n]*\n[\s\S]*?\n\s*```/g, "").trim()
          ? [
              React.createElement(
                Text,
                { key: options.renderer.getKey() },
                raw.replace(/```[^\n]*\n[\s\S]*?\n\s*```/g, "").trim(),
              ),
            ]
          : []),
      ];
    return [React.createElement(Text, { key: options.renderer.getKey() }, raw)];
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

  it("rewrites unchecked task list markers", () => {
    expect(rewriteMarkdownTaskListMarkers("- [ ] buy milk")).toBe(
      "- ☐ buy milk",
    );
  });

  it("rewrites every task item of one list", () => {
    expect(rewriteMarkdownTaskListMarkers("- [ ] a\n- [x] b\n- [ ] c")).toBe(
      "- ☐ a\n- ☑ b\n- ☐ c",
    );
  });

  it("rewrites checked task list markers", () => {
    expect(
      rewriteMarkdownTaskListMarkers("* [x] buy milk\n+ [X] buy eggs"),
    ).toBe("* ☑ buy milk\n+ ☑ buy eggs");
  });

  it("rewrites ordered task list markers", () => {
    expect(rewriteMarkdownTaskListMarkers("1) [ ] buy milk")).toBe(
      "1) ☐ buy milk",
    );
  });

  it("preserves nested task list indentation", () => {
    expect(
      rewriteMarkdownTaskListMarkers("- groceries\n    - [ ] buy milk"),
    ).toBe("- groceries\n    - ☐ buy milk");
  });

  it("leaves task markers inside fenced code blocks untouched", () => {
    const markdown =
      "  ```md\n  - [ ] buy milk\n  ```\n\t~~~\n\t- [x] buy eggs\n\t~~~";

    expect(rewriteMarkdownTaskListMarkers(markdown)).toBe(markdown);
  });

  it("leaves task markers outside a list item start untouched", () => {
    expect(rewriteMarkdownTaskListMarkers("- buy [ ] milk")).toBe(
      "- buy [ ] milk",
    );
  });

  it("leaves indented code untouched", () => {
    expect(rewriteMarkdownTaskListMarkers("    - [ ] buy milk")).toBe(
      "    - [ ] buy milk",
    );
    expect(rewriteMarkdownTaskListMarkers("\t- [x] buy eggs")).toBe(
      "\t- [x] buy eggs",
    );
  });

  it("keeps a shorter fence line inside a longer fence as code", () => {
    const markdown = "````md\n```\n- [ ] buy milk\n```\n````";

    expect(rewriteMarkdownTaskListMarkers(markdown)).toBe(markdown);
  });

  it("leaves indented code inside a list item untouched", () => {
    const markdown = "- item\n\n      - [ ] buy milk";

    expect(rewriteMarkdownTaskListMarkers(markdown)).toBe(markdown);
  });

  it("rewrites task list markers inside a block quote", () => {
    expect(rewriteMarkdownTaskListMarkers("> - [ ] buy milk")).toBe(
      "> - ☐ buy milk",
    );
  });

  it("leaves a code sample untouched when the same task line follows it", () => {
    expect(
      rewriteMarkdownTaskListMarkers(
        "```\n- [ ] buy milk\n```\n\n- [ ] buy milk",
      ),
    ).toBe("```\n- [ ] buy milk\n```\n\n- ☐ buy milk");
  });

  it("leaves a code sample inside a sibling item untouched", () => {
    const markdown =
      "- here is the syntax:\n\n  ```\n  - [ ] a\n  ```\n\n- [ ] a";

    expect(rewriteMarkdownTaskListMarkers(markdown)).toBe(
      "- here is the syntax:\n\n  ```\n  - [ ] a\n  ```\n\n- ☐ a",
    );
  });

  it("rewrites a task list quoted inside a list item", () => {
    expect(rewriteMarkdownTaskListMarkers("- quote:\n  > - [ ] q")).toBe(
      "- quote:\n  > - ☐ q",
    );
  });

  it("renders task items with their checkbox glyph", async () => {
    await render("- [ ] buy milk");

    expect(container.textContent).toContain("- ☐ buy milk");
  });

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

  it("keys sibling code blocks apart and keeps their state across re-parses", async () => {
    vi.useFakeTimers();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => errors.mockRestore());
    const block =
      "1. build it:\n   ```sh\n   pnpm build\n   ```\n   then run it:\n   ```sh\n   pnpm start\n   ```";

    await render(block);
    const buttons = container.querySelectorAll('[aria-label="Copy code"]');
    expect(buttons).toHaveLength(2);
    await act(async () => {
      click(buttons[0] as Element);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="CheckIcon"]')).not.toBeNull();

    await render(`${block}\n   done`);
    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    expect(container.textContent).toContain("done");
    expect(container.querySelectorAll('[aria-label="Copy code"]')).toHaveLength(
      2,
    );
    expect(container.querySelector('[data-testid="CheckIcon"]')).not.toBeNull();
    expect(container.textContent).toContain("pnpm start");
    expect(
      errors.mock.calls.some((call) => String(call[0]).includes("same key")),
    ).toBe(false);
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
