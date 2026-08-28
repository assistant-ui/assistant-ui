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
