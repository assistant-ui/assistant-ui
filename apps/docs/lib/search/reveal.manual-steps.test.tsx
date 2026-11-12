// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManualSteps } from "@/components/shared/manual-steps";
import { revealPageMatch } from "./reveal";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("revealPageMatch inside collapsed manual steps", () => {
  it("opens the steps before scrolling to the match", async () => {
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this);
    });
    render(
      <ManualSteps>
        <h3 id="multiple-threads">Multiple threads</h3>
      </ManualSteps>,
    );
    const steps = document.querySelector<HTMLElement>("[data-manual-steps]")!;
    const heading = document.getElementById("multiple-threads")!;
    expect(steps.getAttribute("hidden")).toBe("until-found");

    act(() => {
      revealPageMatch(heading, "start");
    });

    expect(steps.dataset.state).toBe("open");
    expect(steps.hasAttribute("hidden")).toBe(false);
    await waitFor(() => expect(scrolled).toContain(heading));
  });
});
