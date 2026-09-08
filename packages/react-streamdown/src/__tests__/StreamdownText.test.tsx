import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import type { ReactNode } from "react";
import { defaultRehypePlugins } from "streamdown";
import { StreamdownTextPrimitive } from "../primitives/StreamdownText";
import type {
  StreamdownTextComponents,
  StreamdownProps,
  SyntaxHighlighterProps,
  CodeHeaderProps,
} from "../types";

Element.prototype.scrollTo ??= function scrollTo() {};

afterEach(cleanup);

describe("StreamdownTextPrimitive", () => {
  it("renders without a SmoothContextProvider", () => {
    expect(() =>
      render(
        <TextMessagePartProvider text="hello" isRunning>
          <StreamdownTextPrimitive />
        </TextMessagePartProvider>,
      ),
    ).not.toThrow();
  });

  it("updates streamdown controls when the message completes", async () => {
    const table = `| a | b |\n| - | - |\n| 1 | 2 |`;

    const { container, rerender } = render(
      <TextMessagePartProvider text={table} isRunning>
        <StreamdownTextPrimitive />
      </TextMessagePartProvider>,
    );

    expect(
      container.querySelector("[data-status]")?.getAttribute("data-status"),
    ).toBe("running");
    expect(
      ((await screen.findByTitle("Copy table")) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      ((await screen.findByTitle("Download table")) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    rerender(
      <TextMessagePartProvider text={table} isRunning={false}>
        <StreamdownTextPrimitive />
      </TextMessagePartProvider>,
    );

    expect(
      container.querySelector("[data-status]")?.getAttribute("data-status"),
    ).toBe("complete");
    expect(
      ((await screen.findByTitle("Copy table")) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      ((await screen.findByTitle("Download table")) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("settles on the latest text when defer is enabled", async () => {
    const { rerender } = render(
      <TextMessagePartProvider text="first chunk" isRunning>
        <StreamdownTextPrimitive defer />
      </TextMessagePartProvider>,
    );

    expect(await screen.findByText("first chunk")).toBeTruthy();

    rerender(
      <TextMessagePartProvider text="first chunk second chunk" isRunning>
        <StreamdownTextPrimitive defer />
      </TextMessagePartProvider>,
    );

    expect(await screen.findByText("first chunk second chunk")).toBeTruthy();

    rerender(
      <TextMessagePartProvider
        text="first chunk second chunk"
        isRunning={false}
      >
        <StreamdownTextPrimitive defer />
      </TextMessagePartProvider>,
    );

    expect(await screen.findByText("first chunk second chunk")).toBeTruthy();
  });

  it("renders settled text in full when smooth is enabled", async () => {
    render(
      <TextMessagePartProvider text="hello smooth" isRunning={false}>
        <StreamdownTextPrimitive smooth />
      </TextMessagePartProvider>,
    );

    expect(await screen.findByText("hello smooth")).toBeTruthy();
  });

  it("accepts a SmoothOptions object and keeps data-status smooth-aware", async () => {
    const { container } = render(
      <TextMessagePartProvider text="tuned reveal" isRunning={false}>
        <StreamdownTextPrimitive
          smooth={{ drainMs: 500, maxCharsPerFrame: 30 }}
        />
      </TextMessagePartProvider>,
    );

    expect(await screen.findByText("tuned reveal")).toBeTruthy();
    expect(
      container.querySelector("[data-status]")?.getAttribute("data-status"),
    ).toBe("complete");
  });

  describe("security and user rehypePlugins", () => {
    type HastNode = {
      tagName?: string;
      properties?: Record<string, unknown>;
      children?: HastNode[];
    };

    const stampAnchors = () => (tree: HastNode) => {
      const walk = (node: HastNode) => {
        if (node.tagName === "a") {
          node.properties = { ...node.properties, dataUserPlugin: "true" };
        }
        node.children?.forEach(walk);
      };
      walk(tree);
    };
    const userRehypePlugins = [stampAnchors] as unknown as NonNullable<
      StreamdownProps["rehypePlugins"]
    >;

    const markdown =
      "[good](https://trusted.example.com/page) and [evil](https://evil.example.com)";
    const security = {
      allowedLinkPrefixes: ["https://trusted.example.com"],
      defaultOrigin: "https://trusted.example.com",
      blockedLinkClass: "blocked-link",
    };

    it("applies both the hardening pipeline and user rehypePlugins", async () => {
      const { container } = render(
        <TextMessagePartProvider text={markdown} isRunning={false}>
          <StreamdownTextPrimitive
            security={security}
            rehypePlugins={userRehypePlugins}
            linkSafety={{ enabled: false }}
          />
        </TextMessagePartProvider>,
      );

      expect(await screen.findByText(/\[blocked\]/)).toBeTruthy();
      expect(
        container.querySelector('a[href^="https://evil.example.com"]'),
      ).toBeNull();

      const goodAnchor = container.querySelector(
        'a[href="https://trusted.example.com/page"]',
      );
      expect(goodAnchor).not.toBeNull();
      expect(goodAnchor!.getAttribute("data-user-plugin")).toBe("true");
    });

    it("hardens URLs when only security is set", async () => {
      const { container } = render(
        <TextMessagePartProvider text={markdown} isRunning={false}>
          <StreamdownTextPrimitive
            security={security}
            linkSafety={{ enabled: false }}
          />
        </TextMessagePartProvider>,
      );

      expect(await screen.findByText(/\[blocked\]/)).toBeTruthy();
      expect(
        container.querySelector('a[href^="https://evil.example.com"]'),
      ).toBeNull();
      expect(
        container.querySelector('a[href="https://trusted.example.com/page"]'),
      ).not.toBeNull();
    });

    it("passes user rehypePlugins through when security is not set", async () => {
      const { container } = render(
        <TextMessagePartProvider text={markdown} isRunning={false}>
          <StreamdownTextPrimitive
            rehypePlugins={userRehypePlugins}
            linkSafety={{ enabled: false }}
          />
        </TextMessagePartProvider>,
      );

      const evilAnchor = container.querySelector(
        'a[href^="https://evil.example.com"]',
      );
      expect(evilAnchor).not.toBeNull();
      expect(evilAnchor!.getAttribute("data-user-plugin")).toBe("true");
    });
  });

  it("reads Streamdown's sanitize schema off its default plugin set", () => {
    const entry = defaultRehypePlugins["sanitize"];
    expect(Array.isArray(entry)).toBe(true);

    const [, schema] = entry as [unknown, { protocols?: { href?: string[] } }];
    expect(schema.protocols?.href).toContain("tel");
  });

  it("preserves Streamdown's sanitize extensions with security", () => {
    const Link = vi.fn(
      ({
        children,
        node,
      }: {
        children?: ReactNode;
        node?: { properties?: { href?: unknown } };
      }) => (
        <a data-testid="link" href={node?.properties?.href as string}>
          {children}
        </a>
      ),
    );
    const Code = vi.fn(
      ({
        children,
        node,
      }: {
        children?: ReactNode;
        node?: { properties?: { metastring?: unknown } };
      }) => (
        <code
          data-testid="code"
          data-meta={node?.properties?.metastring as string}
        >
          {children}
        </code>
      ),
    );

    render(
      <TextMessagePartProvider
        text={
          '<a href="tel:123">call</a>\n\n```ts {1} title="demo"\nconst x = 1\n```'
        }
        isRunning={false}
      >
        <StreamdownTextPrimitive
          mode="static"
          linkSafety={{ enabled: false }}
          security={{ allowedProtocols: ["tel:"] }}
          components={{ a: Link, code: Code } as StreamdownTextComponents}
        />
      </TextMessagePartProvider>,
    );

    expect(screen.getByTestId("link").getAttribute("href")).toBe("tel:123");
    expect(screen.getByTestId("code").getAttribute("data-meta")).toBe(
      '{1} title="demo"',
    );
  });

  it("applies allowedTags when security is enabled", () => {
    const { container } = render(
      <TextMessagePartProvider text="<mark>keep</mark>" isRunning={false}>
        <StreamdownTextPrimitive
          mode="static"
          allowedTags={{ mark: [] }}
          security={{}}
        />
      </TextMessagePartProvider>,
    );

    expect(container.querySelector("mark")?.textContent).toBe("keep");
  });

  describe("default fenced code updates", () => {
    it.each([
      { name: "streaming", isRunning: true, props: {} },
      { name: "static", isRunning: false, props: { mode: "static" as const } },
      { name: "deferred", isRunning: true, props: { defer: true } },
    ])(
      "updates $name fenced code from a prefix append",
      async ({ isRunning, props }) => {
        const { rerender } = render(
          <TextMessagePartProvider
            text={"```ts\nfir\n```"}
            isRunning={isRunning}
          >
            <StreamdownTextPrimitive {...props} />
          </TextMessagePartProvider>,
        );

        expect(await screen.findByText("fir")).toBeTruthy();

        rerender(
          <TextMessagePartProvider
            text={"```ts\nfirst\n```"}
            isRunning={isRunning}
          >
            <StreamdownTextPrimitive {...props} />
          </TextMessagePartProvider>,
        );

        expect(await screen.findByText("first")).toBeTruthy();
        expect(screen.queryByText("fir")).toBeNull();
      },
    );

    it.each([
      { name: "streaming", isRunning: true, props: {} },
      { name: "static", isRunning: false, props: { mode: "static" as const } },
      { name: "deferred", isRunning: true, props: { defer: true } },
    ])(
      "replaces $name fenced code without leaving the previous body",
      async ({ isRunning, props }) => {
        const { rerender } = render(
          <TextMessagePartProvider
            text={"```ts\nfirst\n```"}
            isRunning={isRunning}
          >
            <StreamdownTextPrimitive {...props} />
          </TextMessagePartProvider>,
        );

        expect(await screen.findByText("first")).toBeTruthy();

        rerender(
          <TextMessagePartProvider
            text={"```ts\nsecond\n```"}
            isRunning={isRunning}
          >
            <StreamdownTextPrimitive {...props} />
          </TextMessagePartProvider>,
        );

        expect(await screen.findByText("second")).toBeTruthy();
        expect(screen.queryByText("first")).toBeNull();
      },
    );
  });

  describe("code adapter with custom components", () => {
    const fencedMarkdown = "```ts\nconst x = 1;\n```";

    it("renders user pre and code through the adapter when SyntaxHighlighter is set", () => {
      const pre = vi.fn(({ node: _, ...p }: any) => (
        <pre data-testid="user-pre" {...p} />
      ));
      const code = vi.fn(({ node: _, ...p }: any) => (
        <code data-testid="user-code" {...p} />
      ));
      const SyntaxHighlighter = vi.fn(
        ({ code, components: { Pre, Code } }: SyntaxHighlighterProps) => (
          <Pre>
            <Code>{code}</Code>
          </Pre>
        ),
      );
      render(
        <TextMessagePartProvider
          text={`inline \`x\` and\n\n${fencedMarkdown}`}
          isRunning={false}
        >
          <StreamdownTextPrimitive
            mode="static"
            components={
              {
                pre,
                code,
                SyntaxHighlighter,
              } as unknown as StreamdownTextComponents
            }
          />
        </TextMessagePartProvider>,
      );

      const inline = screen.getAllByTestId("user-code")[0]!;
      expect(inline.textContent).toBe("x");
      expect(inline.className).toContain("aui-streamdown-inline-code");
      expect(
        screen.getByTestId("user-pre").querySelector("[data-testid=user-code]")
          ?.textContent,
      ).toContain("const x = 1;");
      expect(pre).toHaveBeenCalledTimes(1);
    });

    it("wraps the block fallback in user pre and code", () => {
      const pre = ({ node: _, ...p }: any) => (
        <pre data-testid="user-pre" {...p} />
      );
      const code = ({ node: _, ...p }: any) => (
        <code data-testid="user-code" {...p} />
      );
      const { container } = render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive
            mode="static"
            components={{ pre, code } as StreamdownTextComponents}
            componentsByLanguage={{
              mermaid: { SyntaxHighlighter: () => <div /> },
            }}
          />
        </TextMessagePartProvider>,
      );

      expect(
        container.querySelector(
          "[data-testid=user-pre] > [data-testid=user-code]",
        )?.textContent,
      ).toContain("const x = 1;");
    });

    it("wraps a fenced block in user pre and code with no other adapter trigger", () => {
      const pre = ({ node: _, ...p }: any) => (
        <pre data-testid="user-pre" {...p} />
      );
      const code = ({ node: _, ...p }: any) => (
        <code data-testid="user-code" {...p} />
      );
      const { container } = render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive
            mode="static"
            components={{ pre, code } as StreamdownTextComponents}
          />
        </TextMessagePartProvider>,
      );

      expect(
        container.querySelector(
          "[data-testid=user-pre] > [data-testid=user-code]",
        )?.textContent,
      ).toContain("const x = 1;");
    });

    it("renders a raw pre without a code child through the user pre", () => {
      const pre = ({ node: _, ...p }: any) => (
        <pre data-testid="user-pre" {...p} />
      );
      render(
        <TextMessagePartProvider text="<pre>raw text</pre>" isRunning={false}>
          <StreamdownTextPrimitive
            mode="static"
            components={{ pre } as StreamdownTextComponents}
          />
        </TextMessagePartProvider>,
      );

      expect(screen.getByTestId("user-pre").textContent).toBe("raw text");
    });

    it("keeps a raw pre element when no user pre is set", () => {
      const { container } = render(
        <TextMessagePartProvider text="<pre>raw text</pre>" isRunning={false}>
          <StreamdownTextPrimitive mode="static" />
        </TextMessagePartProvider>,
      );

      expect(container.querySelector("pre")?.textContent).toBe("raw text");
    });

    it("keeps the pre element mounted when components is a fresh inline object", () => {
      const pre = ({ node: _, ...p }: any) => (
        <pre data-testid="user-pre" {...p} />
      );
      const view = (
        <TextMessagePartProvider text="<pre>raw text</pre>" isRunning={false}>
          <StreamdownTextPrimitive
            mode="static"
            components={{ pre } as StreamdownTextComponents}
          />
        </TextMessagePartProvider>
      );
      const { rerender } = render(view);
      const first = screen.getByTestId("user-pre");

      rerender(
        <TextMessagePartProvider text="<pre>raw text</pre>" isRunning={false}>
          <StreamdownTextPrimitive
            mode="static"
            components={{ pre } as StreamdownTextComponents}
          />
        </TextMessagePartProvider>,
      );

      expect(screen.getByTestId("user-pre")).toBe(first);
    });

    it("accepts intrinsic tag names for pre and code as typed components", () => {
      const components: StreamdownTextComponents = {
        pre: "section",
        code: "span",
      };
      const { container } = render(
        <TextMessagePartProvider
          text={"inline `x`\n\n<pre>raw text</pre>"}
          isRunning={false}
        >
          <StreamdownTextPrimitive mode="static" components={components} />
        </TextMessagePartProvider>,
      );

      expect(container.querySelector("p > span")?.textContent).toBe("x");
      expect(container.querySelector("section")?.textContent).toBe("raw text");
    });

    it("accepts intrinsic tag names for pre and code", () => {
      const SyntaxHighlighter = ({
        code,
        components: { Pre, Code },
      }: SyntaxHighlighterProps) => (
        <Pre data-testid="tag-pre">
          <Code>{code}</Code>
        </Pre>
      );
      render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive
            mode="static"
            components={
              {
                pre: "section",
                code: "span",
                SyntaxHighlighter,
              } as StreamdownTextComponents
            }
          />
        </TextMessagePartProvider>,
      );

      const wrapper = screen.getByTestId("tag-pre");
      expect(wrapper.tagName).toBe("SECTION");
      expect(wrapper.querySelector("span")?.textContent).toContain(
        "const x = 1;",
      );
    });

    it("renders without throwing when SyntaxHighlighter is provided", () => {
      const SyntaxHighlighter = vi.fn(
        ({ code, language }: SyntaxHighlighterProps) => (
          <div data-testid="highlighter">{`${language}:${code}`}</div>
        ),
      );
      const components = {
        SyntaxHighlighter,
      } as unknown as StreamdownTextComponents;

      expect(() =>
        render(
          <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
            <StreamdownTextPrimitive components={components} />
          </TextMessagePartProvider>,
        ),
      ).not.toThrow();

      expect(SyntaxHighlighter).toHaveBeenCalled();
      const callArgs = SyntaxHighlighter.mock.calls[0]![0];
      expect(callArgs.language).toBe("ts");
      expect(callArgs.code.trim()).toBe("const x = 1;");
    });

    it("renders without throwing when only CodeHeader is provided", () => {
      const CodeHeader = vi.fn(({ language }: CodeHeaderProps) => (
        <div data-testid="header">{language}</div>
      ));
      const components = { CodeHeader } as unknown as StreamdownTextComponents;

      const { container } = render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive components={components} />
        </TextMessagePartProvider>,
      );

      expect(CodeHeader).toHaveBeenCalled();
      expect(screen.getByTestId("header").textContent).toBe("ts");
      // Fallback must wrap <code> in <pre> so browsers preserve whitespace.
      expect(container.querySelector("pre > code")).not.toBeNull();
    });

    it("renders without throwing when componentsByLanguage is provided for an unmatched language", () => {
      const PythonHighlighter = vi.fn(() => (
        <div data-testid="python">python</div>
      ));

      const { container } = render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive
            componentsByLanguage={{
              python: { SyntaxHighlighter: PythonHighlighter },
            }}
          />
        </TextMessagePartProvider>,
      );

      // block is typescript, python config must be ignored and not invoked
      expect(PythonHighlighter).not.toHaveBeenCalled();
      expect(container.querySelector("pre > code")).not.toBeNull();
    });

    it("dispatches to language-specific SyntaxHighlighter", () => {
      const TsHighlighter = vi.fn(({ code }: SyntaxHighlighterProps) => (
        <div data-testid="ts-hl">{code}</div>
      ));
      const FallbackHighlighter = vi.fn(() => (
        <div data-testid="fallback-hl">fallback</div>
      ));

      render(
        <TextMessagePartProvider text={fencedMarkdown} isRunning={false}>
          <StreamdownTextPrimitive
            components={{ SyntaxHighlighter: FallbackHighlighter }}
            componentsByLanguage={{
              ts: { SyntaxHighlighter: TsHighlighter },
            }}
          />
        </TextMessagePartProvider>,
      );

      expect(TsHighlighter).toHaveBeenCalled();
      expect(FallbackHighlighter).not.toHaveBeenCalled();
      expect(screen.getByTestId("ts-hl").textContent?.trim()).toBe(
        "const x = 1;",
      );
    });
  });
});
