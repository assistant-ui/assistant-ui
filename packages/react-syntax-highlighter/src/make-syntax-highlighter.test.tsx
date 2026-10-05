import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef, FC } from "react";
import type { SyntaxHighlighterProps as SHP } from "react-syntax-highlighter";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { afterEach, describe, expect, it } from "vitest";
import { makeMakeSyntaxHighlighter } from "./make-syntax-highlighter";

afterEach(cleanup);

const Pre: FC<ComponentPropsWithoutRef<"pre">> = (props) => (
  <pre data-testid="pre" {...props} />
);
const Code: FC<ComponentPropsWithoutRef<"code">> = (props) => (
  <code data-testid="code" {...props} />
);

const components: SyntaxHighlighterProps["components"] = { Pre, Code };

const setup = () => {
  const received: SHP[] = [];
  const Highlighter = (props: SHP) => {
    received.push(props);
    const {
      PreTag: P = "pre",
      CodeTag: C = "code",
      language,
      children,
    } = props;
    return (
      <P data-language={language}>
        <C>{children}</C>
      </P>
    );
  };
  return { Highlighter, received };
};

describe("makeMakeSyntaxHighlighter", () => {
  it("renders the code through the markdown Pre and Code components", () => {
    const { Highlighter, received } = setup();
    const SyntaxHighlighter = makeMakeSyntaxHighlighter(Highlighter)({});

    render(
      <SyntaxHighlighter
        components={components}
        language="ts"
        code="const a = 1;"
      />,
    );

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      PreTag: Pre,
      CodeTag: Code,
      language: "ts",
      children: "const a = 1;",
    });
    expect(screen.getByTestId("pre").dataset["language"]).toBe("ts");
    expect(screen.getByTestId("code").textContent).toBe("const a = 1;");
  });

  it("forwards the config to every render", () => {
    const { Highlighter, received } = setup();
    const style = { hljs: { color: "red" } };
    const SyntaxHighlighter = makeMakeSyntaxHighlighter(Highlighter)({
      style,
      showLineNumbers: true,
      wrapLongLines: true,
      customStyle: { margin: 0 },
    });

    const { rerender } = render(
      <SyntaxHighlighter components={components} language="js" code="a" />,
    );
    rerender(
      <SyntaxHighlighter components={components} language="py" code="b" />,
    );

    expect(received).toHaveLength(2);
    for (const props of received) {
      expect(props).toMatchObject({
        style,
        showLineNumbers: true,
        wrapLongLines: true,
        customStyle: { margin: 0 },
      });
    }
    expect(received.map((p) => [p.language, p.children])).toEqual([
      ["js", "a"],
      ["py", "b"],
    ]);
  });

  it("lets the config override PreTag and CodeTag", () => {
    const { Highlighter, received } = setup();
    const OwnPre: FC<ComponentPropsWithoutRef<"pre">> = (props) => (
      <pre data-testid="own-pre" {...props} />
    );
    const SyntaxHighlighter = makeMakeSyntaxHighlighter(Highlighter)({
      PreTag: OwnPre,
      CodeTag: "span",
    });

    render(
      <SyntaxHighlighter components={components} language="ts" code="x" />,
    );

    expect(received[0]).toMatchObject({ PreTag: OwnPre, CodeTag: "span" });
    expect(screen.getByTestId("own-pre").textContent).toBe("x");
    expect(screen.queryByTestId("pre")).toBeNull();
  });

  it("keeps the language and code of each render over the config", () => {
    const { Highlighter, received } = setup();
    const config = { language: "config-lang", children: "config-code" };
    const SyntaxHighlighter = makeMakeSyntaxHighlighter(Highlighter)(
      config as Omit<SHP, "language" | "children">,
    );

    render(
      <SyntaxHighlighter components={components} language="ts" code="x" />,
    );

    expect(received[0]).toMatchObject({ language: "ts", children: "x" });
  });

  it("passes an empty language and code through unchanged", () => {
    const { Highlighter, received } = setup();
    const SyntaxHighlighter = makeMakeSyntaxHighlighter(Highlighter)({});

    render(<SyntaxHighlighter components={components} language="" code="" />);

    expect(received[0]).toMatchObject({ language: "", children: "" });
    expect(screen.getByTestId("code").textContent).toBe("");
  });

  it("does not forward the markdown node to the highlighter", () => {
    const { Highlighter, received } = setup();
    const SyntaxHighlighter = makeMakeSyntaxHighlighter(Highlighter)({});

    render(
      <SyntaxHighlighter
        components={components}
        language="ts"
        code="x"
        node={{ type: "element", tagName: "pre", properties: {}, children: [] }}
      />,
    );

    expect(received[0]).not.toHaveProperty("node");
    expect(received[0]).not.toHaveProperty("components");
  });

  it("returns a named component per config", () => {
    const { Highlighter } = setup();
    const make = makeMakeSyntaxHighlighter(Highlighter);
    const A = make({});
    const B = make({});

    expect(A).not.toBe(B);
    expect(A.displayName).toBe("PrismSyntaxHighlighter");
    expect(B.displayName).toBe("PrismSyntaxHighlighter");
  });
});
