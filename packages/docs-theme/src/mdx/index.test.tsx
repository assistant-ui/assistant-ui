// @vitest-environment jsdom

import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { assistantUiMdxComponents, Callout, Tab, Tabs } from "./index";

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

const render = (node: ReactNode) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(node));
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  return container;
};

it("labels a callout by its type and treats warn as warning", () => {
  const container = render(<Callout type="warn">Careful</Callout>);
  const callout = container.firstElementChild!;
  expect(callout.getAttribute("data-type")).toBe("warning");
  expect(callout.querySelector("p")?.textContent).toBe("Warning");
});

it("renders a Markdown blockquote as an info callout", () => {
  const container = render(
    createElement(assistantUiMdxComponents.blockquote, null, "Quoted"),
  );
  expect(container.querySelector("blockquote")).toBeNull();
  expect(
    container.querySelector(".aui-docs-callout")?.getAttribute("data-type"),
  ).toBe("info");
});

it("shows one tab panel at a time and switches on click", () => {
  const container = render(
    <Tabs items={["Next.js", "Vite"]}>
      <Tab>next dev</Tab>
      <Tab>vite</Tab>
    </Tabs>,
  );
  const visible = () =>
    [...container.querySelectorAll('[role="tabpanel"]:not([hidden])')].map(
      (panel) => panel.textContent,
    );

  expect(visible()).toEqual(["next dev"]);
  act(() =>
    container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!.click(),
  );
  expect(visible()).toEqual(["vite"]);
});

it("links each heading to itself without changing its id", () => {
  const container = render(
    createElement(assistantUiMdxComponents.h2, { id: "setup" }, "Setup"),
  );
  const heading = container.querySelector("h2")!;
  expect(heading.id).toBe("setup");
  expect(heading.querySelector("a")?.getAttribute("href")).toBe("#setup");
});

it("copies a link to the heading from its anchor button", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const container = render(
    createElement(assistantUiMdxComponents.h3, { id: "install" }, "Install"),
  );

  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Copy anchor link"]',
      )!
      .click(),
  );

  expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/#install$/));
});
