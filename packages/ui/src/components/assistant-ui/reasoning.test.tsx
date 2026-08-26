import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReasoningRoot } from "./reasoning";

const stubs = vi.hoisted(() => ({
  lockScroll: vi.fn(),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useScrollLock: () => stubs.lockScroll,
}));

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({
    open,
    onOpenChange,
    children,
    ...props
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: ReactNode;
  } & ComponentProps<"div">) => (
    <div data-open={open ? "true" : "false"} {...props}>
      {children}
      <button
        type="button"
        data-testid="reasoning-toggle"
        onClick={() => onOpenChange?.(!open)}
      />
    </div>
  ),
  CollapsibleTrigger: (props: ComponentProps<"button">) => (
    <button type="button" {...props} />
  ),
  CollapsibleContent: (props: ComponentProps<"div">) => <div {...props} />,
}));

afterEach(() => {
  cleanup();
  stubs.lockScroll.mockReset();
});

const isOpen = () =>
  document
    .querySelector("[data-slot='reasoning-root']")
    ?.getAttribute("data-open") === "true";

describe("ReasoningRoot", () => {
  it("does not read a ref while computing open state", () => {
    const source = readFileSync(
      resolve("src/components/assistant-ui/reasoning.tsx"),
      "utf8",
    );
    const start = source.indexOf("function ReasoningRoot");
    const end = source.indexOf("function ReasoningFade");
    const body = source.slice(start, end);
    const renderPhase = body.replace(
      /useLayoutEffect\([\s\S]*?\n  \}, \[[^\]]*\]\);/,
      "",
    );

    expect(renderPhase).not.toMatch(/\w+Ref\.current/);
  });

  it("stays collapsed when idle and defaultOpen is false", () => {
    render(<ReasoningRoot>body</ReasoningRoot>);
    expect(isOpen()).toBe(false);
  });

  it("opens when defaultOpen is true", () => {
    render(<ReasoningRoot defaultOpen>body</ReasoningRoot>);
    expect(isOpen()).toBe(true);
  });

  it("holds the panel open while streaming, then returns to defaultOpen", () => {
    const { rerender } = render(<ReasoningRoot streaming>body</ReasoningRoot>);
    expect(isOpen()).toBe(true);

    rerender(<ReasoningRoot streaming={false}>body</ReasoningRoot>);
    expect(isOpen()).toBe(false);
  });

  it("stays open across a streaming transition when defaultOpen is true", () => {
    const { rerender } = render(
      <ReasoningRoot defaultOpen streaming>
        body
      </ReasoningRoot>,
    );
    expect(isOpen()).toBe(true);

    rerender(
      <ReasoningRoot defaultOpen streaming={false}>
        body
      </ReasoningRoot>,
    );
    expect(isOpen()).toBe(true);
  });

  it("lets a controlled open value win over streaming", () => {
    const { rerender } = render(
      <ReasoningRoot open={false} streaming>
        body
      </ReasoningRoot>,
    );
    expect(isOpen()).toBe(false);

    rerender(
      <ReasoningRoot open streaming>
        body
      </ReasoningRoot>,
    );
    expect(isOpen()).toBe(true);
  });

  it("lets the first manual toggle take over from streaming", () => {
    const { rerender } = render(<ReasoningRoot streaming>body</ReasoningRoot>);
    expect(isOpen()).toBe(true);

    fireEvent.click(
      document.querySelector("[data-testid='reasoning-toggle']")!,
    );
    expect(isOpen()).toBe(false);

    rerender(<ReasoningRoot streaming={false}>body</ReasoningRoot>);
    expect(isOpen()).toBe(false);
  });

  it("locks scroll on a streaming transition only when the resting state is collapsed", () => {
    const collapsed = render(<ReasoningRoot>body</ReasoningRoot>);
    expect(stubs.lockScroll).not.toHaveBeenCalled();

    collapsed.rerender(<ReasoningRoot streaming>body</ReasoningRoot>);
    expect(stubs.lockScroll).toHaveBeenCalledTimes(1);

    stubs.lockScroll.mockClear();
    cleanup();

    const opened = render(<ReasoningRoot defaultOpen>body</ReasoningRoot>);
    opened.rerender(
      <ReasoningRoot defaultOpen streaming>
        body
      </ReasoningRoot>,
    );
    expect(stubs.lockScroll).not.toHaveBeenCalled();
  });
});
