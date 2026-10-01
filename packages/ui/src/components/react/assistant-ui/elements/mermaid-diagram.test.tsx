import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MermaidDiagram } from "./mermaid-diagram";

const FLOW = `graph TD
  W[Webview] -->|postMessage| H[Extension host]
  H --> W`;

const adoptedCss = () =>
  document.adoptedStyleSheets
    .flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText))
    .join("\n");

describe("MermaidDiagram", () => {
  beforeEach(() => {
    Object.defineProperty(document, "adoptedStyleSheets", {
      value: [],
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(document, "adoptedStyleSheets");
  });

  it("renders without inline styles, which a strict CSP blocks", () => {
    const { container } = render(<MermaidDiagram code={FLOW} />);

    const diagram = container.querySelector('[data-slot="mermaid-diagram"]');
    const svg = diagram?.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(diagram?.querySelector("style")).toBeNull();
    expect(svg?.hasAttribute("data-aui-style")).toBe(true);
    expect(svg?.style.getPropertyValue("--bg")).toBe("var(--background)");
    expect(svg?.style.getPropertyValue("--fg")).toBe("var(--foreground)");
    expect(adoptedCss()).toContain("--_node-fill");
    expect(adoptedCss()).not.toContain("@import");
  });

  it("keeps the label font rule that follows the font @import", () => {
    const { container } = render(<MermaidDiagram code={FLOW} />);

    const label = container.querySelector("svg text");
    const textRule = document.adoptedStyleSheets
      .flatMap((sheet) => [...sheet.cssRules])
      .find(
        (rule): rule is CSSStyleRule =>
          rule instanceof CSSStyleRule &&
          label !== null &&
          label.matches(rule.selectorText) &&
          rule.style.getPropertyValue("font-family") !== "",
      );
    expect(textRule?.style.getPropertyValue("font-family")).toMatch(
      /^["']Inter["'],\s*system-ui,\s*sans-serif$/,
    );
  });

  it("scopes the adopted rules to the diagram, leaving other SVGs alone", () => {
    const { container } = render(
      <>
        <MermaidDiagram code={FLOW} />
        <svg aria-hidden data-testid="other">
          <text>other</text>
        </svg>
      </>,
    );

    const inside = container.querySelector('[data-slot="mermaid-diagram"]');
    const other = screen.getByTestId("other");
    const rules = document.adoptedStyleSheets.flatMap((sheet) =>
      [...sheet.cssRules].filter(
        (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule,
      ),
    );
    expect(rules.length).toBeGreaterThan(0);
    expect(
      rules.some((rule) =>
        inside?.querySelector("svg")?.matches(rule.selectorText),
      ),
    ).toBe(true);
    for (const rule of rules) {
      expect(other.matches(rule.selectorText)).toBe(false);
      expect(other.querySelector("text")?.matches(rule.selectorText)).toBe(
        false,
      );
    }
  });

  it("renders the original markup without constructable stylesheets", () => {
    Reflect.deleteProperty(document, "adoptedStyleSheets");
    const replaceSync = Object.getOwnPropertyDescriptor(
      CSSStyleSheet.prototype,
      "replaceSync",
    );
    Reflect.deleteProperty(CSSStyleSheet.prototype, "replaceSync");
    try {
      const { container } = render(<MermaidDiagram code={FLOW} />);

      const diagram = container.querySelector('[data-slot="mermaid-diagram"]');
      const svg = diagram?.querySelector("svg");
      expect(diagram?.querySelector("style")?.textContent).toContain(
        "--_node-fill",
      );
      expect(svg?.getAttribute("style")).toContain("--bg:var(--background)");
      expect(svg?.hasAttribute("data-aui-style")).toBe(false);
    } finally {
      if (replaceSync) {
        Object.defineProperty(
          CSSStyleSheet.prototype,
          "replaceSync",
          replaceSync,
        );
      }
    }
  });

  it("shares one stylesheet between diagrams and removes it with the last", () => {
    const first = render(<MermaidDiagram code={FLOW} />);
    const second = render(<MermaidDiagram code={FLOW} />);
    expect(document.adoptedStyleSheets).toHaveLength(1);

    first.unmount();
    expect(document.adoptedStyleSheets).toHaveLength(1);
    second.unmount();
    expect(document.adoptedStyleSheets).toHaveLength(0);
  });

  it.each([
    ["a dangling edge", "graph TD\n  A --> "],
    ["a dangling labeled edge", "flowchart LR\n  A -->|label|"],
    ["an empty diagram", "graph TD"],
  ])("shows the fallback for %s", (_, code) => {
    const { container } = render(<MermaidDiagram code={code} />);

    expect(screen.getByText("diagram could not be rendered")).toBeTruthy();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders a complete diagram whose labels contain arrows", () => {
    const { container } = render(
      <MermaidDiagram code={"graph LR\n  A[a --> b] --> B"} />,
    );

    expect(screen.queryByText("diagram could not be rendered")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
