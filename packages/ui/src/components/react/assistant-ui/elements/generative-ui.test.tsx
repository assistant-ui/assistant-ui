// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock("./mermaid-diagram");
});

const renderDiagram = async (code: string) => {
  const { styledGenerativeUILibrary } = await import("./generative-ui");
  const Diagram = styledGenerativeUILibrary.Diagram!.render as (props: {
    code: string;
    title?: string;
  }) => ReactNode;
  return render(<>{Diagram({ code, title: "Flow" })}</>);
};

describe("styledGenerativeUILibrary Diagram", () => {
  it("shows the busy skeleton until the diagram engine loads", async () => {
    vi.doMock("./mermaid-diagram", () => ({
      MermaidDiagram: ({ code }: { code: string }) => (
        <svg data-testid="diagram">
          <title>{code}</title>
        </svg>
      ),
    }));
    const { container } = await renderDiagram("graph LR\n  A --> B");
    expect(
      container
        .querySelector('[data-slot="mermaid-skeleton"]')
        ?.getAttribute("aria-busy"),
    ).toBe("true");
    expect(await screen.findByTestId("diagram")).not.toBeNull();
    expect(
      container.querySelector('[data-slot="mermaid-skeleton"]'),
    ).toBeNull();
  });

  it("shows the source when the diagram engine fails to load", async () => {
    vi.doMock("./mermaid-diagram", () => {
      throw new Error("chunk failed");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => error.mockRestore());
    const { container } = await renderDiagram("graph LR\n  A --> B");
    expect(
      await screen.findByText((text) => text.includes("A --> B")),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="mermaid-fallback"]'),
    ).not.toBeNull();
    expect(screen.getByText("Flow")).not.toBeNull();
  });
});
