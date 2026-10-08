import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReasoningRoot, ReasoningTrigger } from "./reasoning.aui";
import { Collapsible as BaseCollapsible } from "../../ui/base/collapsible";
import { Collapsible as RadixCollapsible } from "../../ui/radix/collapsible";

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

it.each([BaseCollapsible, RadixCollapsible])(
  "forwards the collapsible root ref",
  (Root) => {
    const ref = createRef<HTMLDivElement>();
    const view = render(<Root ref={ref}>content</Root>);
    expect(ref.current).toBe(
      view.container.querySelector('[data-slot="collapsible"]'),
    );
    expect(ref.current).not.toBeNull();
    view.unmount();
    expect(ref.current).toBeNull();
  },
);
