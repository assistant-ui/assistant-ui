import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { MarkdownText } from "./markdown-text";

const h = vi.hoisted(() => ({
  hasStyleSheet: true,
  cssVariables: {
    "--color-border": "#3f3f46",
    "--color-foreground": "#fafafa",
    "--color-muted": "#27272a",
    "--color-muted-foreground": "#a1a1aa",
    "--color-primary": "#fafafa",
  } as Record<string, string>,
  colorSchemes: [] as string[],
}));

// Uniwind resolves the theme and the variables through the CSSOM, so the server render sees neither.
vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: (names: string[]) =>
    names.map((name) => (h.hasStyleSheet ? h.cssVariables[name] : undefined)),
  useUniwind: () => ({ theme: h.hasStyleSheet ? "dark" : "light" }),
}));

// The real renderer cannot load under the react-native project, so the stand-in paints the colors the options carry the way its default theme does.
vi.mock("react-native-marked", async () => {
  const React = await import("react");
  const { Text } = await import("react-native");
  const defaults = {
    light: { text: "#333333", code: "#f6f8fa" },
    dark: { text: "#ffffff", code: "#161b22" },
  };
  class Renderer {
    getKey() {
      return "md";
    }
  }
  const useMarkdown = (
    raw: string,
    options: {
      colorScheme: "light" | "dark";
      theme?: { colors: { text: string; code: string } };
    },
  ) => {
    h.colorSchemes.push(options.colorScheme);
    const colors = options.theme?.colors ?? defaults[options.colorScheme];
    return [
      React.createElement(
        Text,
        { key: "text", style: { color: colors.text } },
        raw,
        React.createElement(
          Text,
          { key: "code", style: { backgroundColor: colors.code } },
          "code",
        ),
      ),
    ];
  };
  return {
    MarkedLexer: (text: string) => [{ type: "paragraph", raw: text }],
    MarkedTokenizer: class {},
    Renderer,
    useMarkdown,
  };
});

vi.mock("lucide-react-native", () => ({
  CheckIcon: () => null,
  CopyIcon: () => null,
}));
vi.mock("expo-clipboard", () => ({ setStringAsync: vi.fn() }));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const markdown = (
  <MarkdownText text="Some text" type="text" status={{ type: "complete" }} />
);

describe("MarkdownText hydration", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    h.hasStyleSheet = true;
    h.colorSchemes.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
  });

  const nodes = () => ({
    text: container.querySelector<HTMLElement>("div[dir]"),
    code: container.querySelector<HTMLElement>("span"),
  });
  const styles = () => {
    const { text, code } = nodes();
    return { text: text?.style.color, code: code?.style.backgroundColor };
  };

  it("hydrates the server markup and then applies the theme colors", async () => {
    h.hasStyleSheet = false;
    container.innerHTML = renderToString(markdown);
    const server = nodes();
    expect(styles()).toEqual({
      text: "rgb(51, 51, 51)",
      code: "rgb(246, 248, 250)",
    });
    expect(h.colorSchemes).toEqual(["light"]);

    h.hasStyleSheet = true;
    const consoleError = vi.spyOn(console, "error");
    onTestFinished(() => consoleError.mockRestore());
    await act(async () => {
      root = hydrateRoot(container, markdown);
    });

    expect(styles()).toEqual({
      text: "rgb(250, 250, 250)",
      code: "rgb(39, 39, 42)",
    });
    expect(h.colorSchemes).toEqual(["light", "light", "dark"]);
    expect(nodes().text).toBe(server.text);
    expect(nodes().code).toBe(server.code);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("applies the theme colors on the first client render", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(markdown);
    });

    expect(h.colorSchemes).toEqual(["dark"]);
    expect(styles()).toEqual({
      text: "rgb(250, 250, 250)",
      code: "rgb(39, 39, 42)",
    });
  });
});
