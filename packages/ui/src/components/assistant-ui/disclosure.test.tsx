/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { DisclosureContent, DisclosureRoot } from "./disclosure";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

describe("Disclosure", () => {
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
});
