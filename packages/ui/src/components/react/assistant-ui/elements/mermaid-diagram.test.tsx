import { cleanup, render } from "@testing-library/react";
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

  it("shares one stylesheet between diagrams and removes it with the last", () => {
    const first = render(<MermaidDiagram code={FLOW} />);
    const second = render(<MermaidDiagram code={FLOW} />);
    expect(document.adoptedStyleSheets).toHaveLength(1);

    first.unmount();
    expect(document.adoptedStyleSheets).toHaveLength(1);
    second.unmount();
    expect(document.adoptedStyleSheets).toHaveLength(0);
  });
});
