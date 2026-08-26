import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReasoningRoot } from "./reasoning";

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useScrollLock: () => () => {},
}));

vi.mock("@/components/assistant-ui/markdown-text", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/components/assistant-ui/markdown-text")
  >()),
  MarkdownText: ({ children }: React.PropsWithChildren) => children,
}));

afterEach(cleanup);

const openState = (container: HTMLElement) =>
  container
    .querySelector('[data-slot="reasoning-root"]')
    ?.hasAttribute("data-open");

describe("ReasoningRoot", () => {
  it("keeps the initial defaultOpen value when the prop changes", () => {
    const { container, rerender } = render(
      <ReasoningRoot defaultOpen>Reasoning</ReasoningRoot>,
    );

    expect(openState(container)).toBe(true);

    rerender(<ReasoningRoot defaultOpen={false}>Reasoning</ReasoningRoot>);

    expect(openState(container)).toBe(true);
  });

  it("opens temporarily while streaming", () => {
    const { container, rerender } = render(
      <ReasoningRoot streaming={false}>Reasoning</ReasoningRoot>,
    );

    expect(openState(container)).toBe(false);

    rerender(<ReasoningRoot streaming>Reasoning</ReasoningRoot>);
    expect(openState(container)).toBe(true);

    rerender(<ReasoningRoot streaming={false}>Reasoning</ReasoningRoot>);
    expect(openState(container)).toBe(false);
  });
});
