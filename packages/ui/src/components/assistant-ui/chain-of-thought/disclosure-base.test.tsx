/**
 * @vitest-environment jsdom
 */
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { DisclosureContent, DisclosureRoot } from "./disclosure-base";

const { lockSpy } = vi.hoisted(() => ({ lockSpy: vi.fn() }));
vi.mock("@assistant-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/react")>();
  return { ...actual, useScrollLock: () => lockSpy };
});

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

describe("Disclosure base", () => {
  it("supports uncontrolled open/close state", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <DisclosureRoot data-slot="test-disclosure-root" defaultOpen={false}>
          <CollapsibleTrigger data-slot="test-disclosure-trigger">
            Toggle
          </CollapsibleTrigger>
          <DisclosureContent data-slot="test-disclosure-content">
            Content
          </DisclosureContent>
        </DisclosureRoot>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=test-disclosure-trigger]",
    ) as HTMLButtonElement | null;

    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      trigger?.click();
    });

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      root.unmount();
    });
  });

  it("supports controlled state and animation duration override", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const openChanges: boolean[] = [];

    act(() => {
      root.render(
        <DisclosureRoot
          data-slot="test-disclosure-root"
          open
          animationDuration={320}
          onOpenChange={(open) => openChanges.push(open)}
        >
          <CollapsibleTrigger data-slot="test-disclosure-trigger">
            Toggle
          </CollapsibleTrigger>
          <DisclosureContent data-slot="test-disclosure-content">
            Content
          </DisclosureContent>
        </DisclosureRoot>,
      );
    });

    const rootEl = container.querySelector(
      "[data-slot=test-disclosure-root]",
    ) as HTMLDivElement | null;
    const trigger = container.querySelector(
      "[data-slot=test-disclosure-trigger]",
    ) as HTMLButtonElement | null;

    expect(rootEl?.style.getPropertyValue("--animation-duration")).toBe(
      "320ms",
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      trigger?.click();
    });

    expect(openChanges).toEqual([false]);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      root.unmount();
    });
  });

  it("locks scroll on user-initiated close (lockOnClose)", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <DisclosureRoot defaultOpen>
          <CollapsibleTrigger data-slot="lock-trigger">
            Toggle
          </CollapsibleTrigger>
          <DisclosureContent>Content</DisclosureContent>
        </DisclosureRoot>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=lock-trigger]",
    ) as HTMLButtonElement | null;

    lockSpy.mockClear();
    act(() => trigger?.click()); // user closes
    expect(lockSpy).toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("locks scroll on programmatic close only when lockOnProgrammaticClose is set", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const render = (open: boolean) =>
      act(() => {
        root.render(
          <DisclosureRoot
            open={open}
            lockOnProgrammaticClose
            onOpenChange={() => {}}
          >
            <CollapsibleTrigger>Toggle</CollapsibleTrigger>
            <DisclosureContent>Content</DisclosureContent>
          </DisclosureRoot>,
        );
      });

    render(true);
    lockSpy.mockClear();

    render(false); // controlled (programmatic) close
    expect(lockSpy).toHaveBeenCalled();

    lockSpy.mockClear();
    render(true); // reopening must not lock
    expect(lockSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it("locks exactly once on a user close when lockOnProgrammaticClose is also set", () => {
    // The CoT root sets both lockOnClose (default) and lockOnProgrammaticClose,
    // so a user close fires the handler lock AND flips the controlled `open`.
    // The effect must not lock a second time for the same close.
    const container = document.createElement("div");
    const root = createRoot(container);

    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <DisclosureRoot
          open={open}
          lockOnProgrammaticClose
          onOpenChange={setOpen}
        >
          <CollapsibleTrigger data-slot="dual-lock-trigger">
            Toggle
          </CollapsibleTrigger>
          <DisclosureContent>Content</DisclosureContent>
        </DisclosureRoot>
      );
    }

    act(() => root.render(<Controlled />));
    const trigger = container.querySelector(
      "[data-slot=dual-lock-trigger]",
    ) as HTMLButtonElement | null;

    lockSpy.mockClear();
    act(() => trigger?.click()); // user close
    expect(lockSpy).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });
});
