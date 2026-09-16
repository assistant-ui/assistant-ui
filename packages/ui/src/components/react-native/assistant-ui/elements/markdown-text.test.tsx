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
import { MarkedLexer } from "react-native-marked";
import { MarkdownText, TaskListTokenizer } from "./markdown-text";

type MarkdownOptions = {
  colorScheme?: string;
  theme?: { colors?: unknown };
  tokenizer?: unknown;
};

const h = vi.hoisted(() => ({
  setClipboardString: vi.fn(),
  hydrated: true,
  hasStyleSheet: false,
  theme: "light" as "light" | "dark",
  lastOptions: undefined as MarkdownOptions | undefined,
  optionsHistory: [] as MarkdownOptions[],
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
  const { Lexer, Tokenizer } = markedRequire("marked") as {
    Lexer: new (options: { gfm: boolean; tokenizer?: unknown }) => {
      lex(text: string): unknown[];
    };
    Tokenizer: unknown;
  };
  const MarkedLexer = (
    text: string,
    options: { gfm: boolean; tokenizer?: unknown },
  ) => new Lexer(options).lex(text);
  const useMarkdown = (
    raw: string,
    options: {
      renderer: Renderer;
    } & MarkdownOptions,
  ) => {
    h.lastOptions = options;
    h.optionsHistory.push(options);
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
  return { MarkedLexer, MarkedTokenizer: Tokenizer, Renderer, useMarkdown };
});

vi.mock("uniwind", async (importOriginal) => {
  const actual = await importOriginal<typeof import("uniwind")>();
  const colors: Record<string, string> = {
    "--color-foreground": "rgba(9,9,11,1)",
    "--color-primary": "rgba(37,99,235,1)",
    "--color-muted": "rgba(244,244,245,1)",
    "--color-border": "rgba(228,228,231,1)",
  };

  return {
    ...actual,
    withUniwind: (Component: unknown) => Component,
    useCSSVariable: (names: string | string[]) =>
      Array.isArray(names)
        ? names.map((name) => (h.hasStyleSheet ? colors[name] : undefined))
        : undefined,
    useUniwind: () => ({ theme: h.theme }),
  };
});

vi.mock("./surfaces", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./surfaces")>()),
  useHydrated: () => h.hydrated,
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
    h.hydrated = true;
    h.hasStyleSheet = false;
    h.theme = "light";
    h.lastOptions = undefined;
    h.optionsHistory.length = 0;
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

  type LexedToken = {
    type: string;
    text?: string;
    task?: boolean;
    tokens?: LexedToken[];
    items?: LexedToken[];
  };
  const lex = (markdown: string) =>
    MarkedLexer(markdown, {
      gfm: true,
      tokenizer: new TaskListTokenizer(),
    }) as unknown as LexedToken[];
  const itemTexts = (markdown: string) => {
    const texts: string[] = [];
    const visit = (tokens: LexedToken[]) => {
      for (const token of tokens) {
        for (const item of token.items ?? []) {
          const first = item.tokens?.find(
            (child) => child.type === "text" || child.type === "paragraph",
          );
          if (first?.tokens) {
            texts.push(
              first.tokens.map((inline) => inline.text ?? "").join(""),
            );
          }
          visit(item.tokens ?? []);
        }
        if (!token.items) visit(token.tokens ?? []);
      }
    };
    visit(lex(markdown));
    return texts;
  };

  it("folds an unchecked box into the item text", () => {
    expect(itemTexts("- [ ] buy milk")).toEqual(["☐ buy milk"]);
  });

  it("folds checked boxes", () => {
    expect(itemTexts("* [x] buy milk\n+ [X] buy eggs")).toEqual([
      "☑ buy milk",
      "☑ buy eggs",
    ]);
  });

  it("folds every task item of one list", () => {
    expect(itemTexts("- [ ] a\n- [x] b\n- [ ] ab")).toEqual([
      "☐ a",
      "☑ b",
      "☐ ab",
    ]);
  });

  it("folds ordered and nested task items", () => {
    expect(itemTexts("1) [ ] buy milk")).toEqual(["☐ buy milk"]);
    expect(itemTexts("- groceries\n    - [ ] buy milk")).toEqual([
      "groceries",
      "☐ buy milk",
    ]);
  });

  it("folds loose task items", () => {
    expect(itemTexts("- [ ] a\n\n  para\n\n- [x] b")).toEqual(["☐ a", "☑ b"]);
  });

  it("folds task items inside a block quote", () => {
    expect(itemTexts("> - [ ] q")).toEqual(["☐ q"]);
  });

  it("leaves a code sample alone when the same task line follows it", () => {
    const tokens = lex("```\n- [ ] a\n```\n\n- [ ] a");

    expect(tokens[0]).toMatchObject({ type: "code", text: "- [ ] a" });
    expect(itemTexts("```\n- [ ] a\n```\n\n- [ ] a")).toEqual(["☐ a"]);
  });

  it("leaves a marker that does not start the item alone", () => {
    expect(itemTexts("- buy [ ] milk")).toEqual(["buy [ ] milk"]);
    expect(lex("    - [ ] buy milk")[0]?.type).toBe("code");
  });

  it("hands the task list tokenizer to the block renderer", async () => {
    await render("- [ ] buy milk");

    expect(h.lastOptions?.tokenizer).toBeInstanceOf(TaskListTokenizer);
  });

  it("keeps CSSOM-derived options stable until hydration", async () => {
    h.theme = "dark";
    h.hasStyleSheet = true;
    h.hydrated = false;
    await render("Hydration keeps markdown options stable.");
    expect(h.lastOptions?.colorScheme).toBe("light");
    expect(h.lastOptions).not.toHaveProperty("theme");

    h.hydrated = true;
    await render("Hydration keeps markdown options stable.");

    expect(h.optionsHistory.slice(-2)).toEqual([
      expect.objectContaining({ colorScheme: "light" }),
      expect.objectContaining({
        colorScheme: "dark",
        theme: {
          colors: {
            text: "rgba(9,9,11,1)",
            link: "rgba(37,99,235,1)",
            code: "rgba(244,244,245,1)",
            border: "rgba(228,228,231,1)",
          },
        },
      }),
    ]);
    expect(h.optionsHistory.at(-2)).not.toHaveProperty("theme");
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
