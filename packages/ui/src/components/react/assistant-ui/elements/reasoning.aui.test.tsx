import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReasoningRoot, ReasoningTrigger } from "./reasoning.aui";
import { ToolFallbackRoot, ToolFallbackTrigger } from "./tool-fallback.aui";
import { ToolGroupRoot, ToolGroupTrigger } from "./tool-group.aui";
import { CollapsibleRoot as BaseRoot } from "./collapsible-root";
import { CollapsibleRoot as RadixRoot } from "./collapsible-root.radix";

const mocks = vi.hoisted(() => ({
  lock: vi.fn(),
  ref: undefined as { current: HTMLDivElement | null } | undefined,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useScrollLock: (ref: { current: HTMLDivElement | null }) => {
    mocks.ref = ref;
    return mocks.lock;
  },
}));

afterEach(cleanup);

it("forwards the reasoning root to the caller and scroll lock", () => {
  const ref = createRef<HTMLDivElement>();
  const view = render(
    <ReasoningRoot ref={ref}>
      <ReasoningTrigger>reasoning</ReasoningTrigger>
    </ReasoningRoot>,
  );
  const root = view.container.querySelector('[data-slot="reasoning-root"]');
  expect(root).not.toBeNull();
  expect(ref.current).toBe(root);
  expect(mocks.ref?.current).toBe(root);
  fireEvent.click(screen.getByRole("button", { name: "Reasoning" }));
  expect(mocks.lock).toHaveBeenCalledOnce();
  view.unmount();
  expect(ref.current).toBeNull();
});

it.each([
  [
    "tool-fallback-root",
    ToolFallbackRoot,
    <ToolFallbackTrigger key="fallback" toolName="search" />,
  ],
  [
    "tool-group-root",
    ToolGroupRoot,
    <ToolGroupTrigger key="group" count={2} />,
  ],
] as const)("connects %s to its scroll lock", (slot, Root, trigger) => {
  const view = render(<Root>{trigger}</Root>);
  const root = view.container.querySelector(`[data-slot="${slot}"]`);
  expect(root).not.toBeNull();
  expect(mocks.ref?.current).toBe(root);
  fireEvent.click(screen.getByRole("button"));
  expect(mocks.lock).toHaveBeenCalledOnce();
});

it.each([BaseRoot, RadixRoot])(
  "owns the root ref in both registry flavors",
  (Root) => {
    const ref = createRef<HTMLDivElement>();
    const view = render(
      <Root ref={ref} data-testid="root">
        content
      </Root>,
    );
    expect(ref.current).toBe(screen.getByTestId("root"));
    view.unmount();
    expect(ref.current).toBeNull();
  },
);
