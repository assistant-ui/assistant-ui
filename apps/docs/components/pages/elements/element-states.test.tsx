// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ElementStates } from "@/components/demo/elements/states/types";
import { ElementStatesFigure, ElementStatesPreview } from "./element-states";

const STATES: ElementStates = [
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "Running",
    note: "The call is in flight.",
    Component: () => <p>running fixture</p>,
  },
  {
    key: "error",
    label: "Failed",
    note: "The call failed.",
    Component: () => <p>error fixture</p>,
  },
  {
    key: "long-content",
    label: "Long input",
    note: "A long query.",
    Component: () => <p>long fixture</p>,
  },
];

const ONLY_DEFAULT: ElementStates = [{ key: "default", label: "Default" }];

const loadedSlugs: string[] = [];

vi.mock("@/components/demo/elements/states", () => ({
  ELEMENT_STATES: new Proxy(
    {},
    {
      get: (_, slug: string) => async () => {
        loadedSlugs.push(slug);
        return { [slug]: STATES, other: ONLY_DEFAULT };
      },
    },
  ),
}));

vi.mock("@/components/demo/elements/demo-stage", () => ({
  DemoStage: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function renderPreview(slug = "tool-call") {
  return render(
    <ElementStatesFigure
      states={slug === "only-default" ? ONLY_DEFAULT : STATES}
      caption="Live demo"
      canvasClassName=""
    >
      <p>live demo</p>
    </ElementStatesFigure>,
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });
const search = () => new URLSearchParams(window.location.search).get("state");

beforeEach(() => {
  window.history.replaceState(null, "", "/elements/tool-call");
});

afterEach(() => {
  cleanup();
});

describe("ElementStatesPreview", () => {
  it("shows the live demo and its caption by default", () => {
    renderPreview();
    expect(screen.getByText("live demo")).toBeTruthy();
    expect(screen.getByText("Live demo")).toBeTruthy();
    expect(radio("Default").getAttribute("aria-checked")).toBe("true");
  });

  it("selects the state named in ?state= on load", () => {
    window.history.replaceState(null, "", "/elements/tool-call?state=error");
    renderPreview();
    expect(screen.getByText("error fixture")).toBeTruthy();
    expect(screen.getByText("fig. 01 · Failed: The call failed.")).toBeTruthy();
    expect(radio("Failed").getAttribute("aria-checked")).toBe("true");
  });

  it("falls back to the live demo for an unknown ?state=", () => {
    window.history.replaceState(null, "", "/elements/tool-call?state=nope");
    renderPreview();
    expect(screen.getByText("live demo")).toBeTruthy();
  });

  it("pushes a history entry on click, so Back returns to the previous state", () => {
    renderPreview();
    const length = window.history.length;
    fireEvent.click(radio("Running"));
    expect(search()).toBe("running");
    expect(window.history.length).toBe(length + 1);
    expect(screen.getByText("running fixture")).toBeTruthy();

    act(() => {
      window.history.replaceState(null, "", "/elements/tool-call");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByText("live demo")).toBeTruthy();
    expect(radio("Default").getAttribute("aria-checked")).toBe("true");
  });

  it("drops ?state= when Default is clicked", () => {
    window.history.replaceState(null, "", "/elements/tool-call?state=error");
    renderPreview();
    fireEvent.click(radio("Default"));
    expect(search()).toBeNull();
  });

  it("moves selection and focus with arrow, Home, and End keys without adding history", () => {
    renderPreview();
    const group = screen.getByRole("radiogroup");
    const length = window.history.length;

    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(search()).toBe("running");
    expect(document.activeElement).toBe(radio("Running"));

    fireEvent.keyDown(group, { key: "ArrowDown" });
    expect(search()).toBe("error");
    expect(document.activeElement).toBe(radio("Failed"));

    fireEvent.keyDown(group, { key: "End" });
    expect(search()).toBe("long-content");
    expect(document.activeElement).toBe(radio("Long input"));

    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(search()).toBeNull();
    expect(document.activeElement).toBe(radio("Default"));

    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(search()).toBe("long-content");

    fireEvent.keyDown(group, { key: "Home" });
    expect(search()).toBeNull();
    expect(document.activeElement).toBe(radio("Default"));

    expect(window.history.length).toBe(length);
  });

  it("keeps only the selected radio in the tab order", () => {
    window.history.replaceState(null, "", "/elements/tool-call?state=running");
    renderPreview();
    const tabbable = screen
      .getAllByRole("radio")
      .filter((el) => el.getAttribute("tabindex") === "0");
    expect(tabbable).toEqual([radio("Running")]);
  });

  it("hides the switcher when an element has only the default state", () => {
    renderPreview("only-default");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByText("live demo")).toBeTruthy();
  });

  it("loads its own states, picking them out of a shared map", async () => {
    let mounts = 0;
    function LiveDemo() {
      const [count, setCount] = useState(0);
      useEffect(() => {
        mounts += 1;
      }, []);
      return (
        <button type="button" onClick={() => setCount((n) => n + 1)}>
          live demo {count}
        </button>
      );
    }
    render(
      <ElementStatesPreview
        slug="generative-booking"
        caption="Live demo"
        canvasClassName=""
      >
        <LiveDemo />
      </ElementStatesPreview>,
    );
    // The live demo does not wait for the states, and keeps its state when
    // they arrive.
    fireEvent.click(screen.getByText("live demo 0"));
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(await screen.findByRole("radio", { name: "Failed" })).toBeTruthy();
    expect(screen.getByText("live demo 1")).toBeTruthy();
    expect(mounts).toBe(1);
    expect(loadedSlugs).toEqual(["generative-booking"]);
  });
});
