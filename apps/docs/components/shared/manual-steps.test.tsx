// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManualSteps, openManualSteps } from "./manual-steps";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

const steps = () => document.querySelector<HTMLElement>("[data-manual-steps]")!;

describe("manual steps", () => {
  it("hides the steps until found, so find-in-page still reaches them", () => {
    render(
      <ManualSteps>
        <h3 id="install">Install</h3>
      </ManualSteps>,
    );
    expect(steps().getAttribute("hidden")).toBe("until-found");
    expect(steps().dataset.state).toBe("closed");
  });

  it("opens and scrolls into view when the setup menu asks", () => {
    render(
      <ManualSteps>
        <p>Run the installer</p>
      </ManualSteps>,
    );
    let opened = false;
    act(() => {
      opened = openManualSteps();
    });
    expect(opened).toBe(true);
    expect(steps().hasAttribute("hidden")).toBe(false);
    expect(steps().dataset.state).toBe("open");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByText("Run the installer")).toBeTruthy();
  });

  it("reports no steps on a page without them", () => {
    expect(openManualSteps()).toBe(false);
  });

  it("opens for a deep link into the steps", () => {
    window.history.replaceState(null, "", "/#install");
    render(
      <ManualSteps>
        <h3 id="install">Install</h3>
      </ManualSteps>,
    );
    expect(steps().dataset.state).toBe("open");
  });

  it("stays closed for a hash outside the steps", () => {
    window.history.replaceState(null, "", "/#overview");
    render(
      <>
        <h2 id="overview">Overview</h2>
        <ManualSteps>
          <h3 id="install">Install</h3>
        </ManualSteps>
      </>,
    );
    expect(steps().dataset.state).toBe("closed");
  });

  it("opens on a later hash change and on the browser's beforematch", () => {
    const { unmount } = render(
      <ManualSteps>
        <h3 id="install">Install</h3>
      </ManualSteps>,
    );
    act(() => {
      window.history.replaceState(null, "", "/#install");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(steps().dataset.state).toBe("open");
    unmount();

    window.history.replaceState(null, "", "/");
    render(
      <ManualSteps>
        <p>Found text</p>
      </ManualSteps>,
    );
    act(() => {
      steps().dispatchEvent(new Event("beforematch"));
    });
    expect(steps().dataset.state).toBe("open");
  });

  it("opens when a same-page link to a heading inside it is clicked", () => {
    render(
      <>
        <a href="#install">Install (table of contents)</a>
        <a href="#overview">Overview</a>
        <h2 id="overview">Overview</h2>
        <ManualSteps>
          <h3 id="install">Install</h3>
        </ManualSteps>
      </>,
    );
    act(() => {
      screen.getByText("Overview", { selector: "a" }).click();
    });
    expect(steps().dataset.state).toBe("closed");
    act(() => {
      screen.getByText("Install (table of contents)").click();
    });
    expect(steps().dataset.state).toBe("open");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
