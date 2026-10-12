// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { defaultGenerativeUILibrary } from "./index";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const days = {
  $type: "Tabs",
  tabs: ["Day 1", "Day 2", "Day 3"],
  children: [
    { $type: "Text", value: "Golden Gate" },
    { $type: "Text", value: "Big Sur" },
    { $type: "Text", value: "Santa Barbara" },
  ],
};

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const mount = async (node: unknown) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<>{renderGenerativeUI(node, defaultGenerativeUILibrary)}</>);
  });
  const tabs = () => [...container.querySelectorAll('[role="tab"]')];
  const visible = () =>
    [...container.querySelectorAll<HTMLElement>('[role="tabpanel"]')]
      .filter((panel) => !panel.hidden)
      .map((panel) => panel.textContent);
  return { tabs, visible };
};

describe("Tabs", () => {
  it("renders every panel on the server and shows the first", () => {
    const html = renderToStaticMarkup(
      <>{renderGenerativeUI(days, defaultGenerativeUILibrary)}</>,
    );
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(2);
    expect(html).toContain("Santa Barbara");
  });

  it("switches panels on click and with the arrow, Home, and End keys", async () => {
    const { tabs, visible } = await mount(days);
    expect(visible()).toEqual(["Golden Gate"]);

    await act(async () => (tabs()[1] as HTMLButtonElement).click());
    expect(visible()).toEqual(["Big Sur"]);
    expect(tabs().map((tab) => tab.getAttribute("tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
    ]);

    const press = (key: string) =>
      act(async () => {
        tabs()[0]!.parentElement!.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
      });
    await press("ArrowRight");
    expect(visible()).toEqual(["Santa Barbara"]);
    expect(document.activeElement).toBe(tabs()[2]);
    await press("ArrowRight");
    expect(visible()).toEqual(["Golden Gate"]);
    await press("ArrowLeft");
    expect(visible()).toEqual(["Santa Barbara"]);
    await press("Home");
    expect(visible()).toEqual(["Golden Gate"]);
    await press("End");
    expect(visible()).toEqual(["Santa Barbara"]);
  });

  it("names the row of tabs with its label", async () => {
    await mount({ ...days, label: "Trip days" });
    expect(
      document.querySelector('[role="tablist"]')?.getAttribute("aria-label"),
    ).toBe("Trip days");
  });

  it("labels each panel's tab and names a tab missing its label by number", async () => {
    const { tabs } = await mount({ ...days, tabs: ["Day 1"] });
    expect(tabs().map((tab) => tab.textContent)).toEqual(["Day 1", "2", "3"]);
    const panel = document.getElementById(
      tabs()[1]!.getAttribute("aria-controls")!,
    );
    expect(panel?.getAttribute("aria-labelledby")).toBe(tabs()[1]!.id);
  });
});
