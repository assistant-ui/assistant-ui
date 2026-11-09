// @vitest-environment jsdom

import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import {
  assistantUiMdxComponents,
  Callout,
  File,
  Folder,
  Heading,
  Tab,
  Tabs,
} from "./index";

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
  expect(callout.querySelector(".aui-docs-callout-label")?.textContent).toBe(
    "Warning",
  );
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

it("shows the first panel when the default index or items are missing", () => {
  const pastEnd = render(
    <Tabs items={["One", "Two"]} defaultIndex={5}>
      <Tab>First</Tab>
      <Tab>Second</Tab>
    </Tabs>,
  );
  const panels = pastEnd.querySelectorAll<HTMLElement>("[role=tabpanel]");
  expect(panels[0]!.hidden).toBe(false);
  expect(panels[1]!.hidden).toBe(true);
  cleanup?.();
  const noItems = render(
    <Tabs>
      <Tab value="One">First</Tab>
      <Tab value="Two">Second</Tab>
    </Tabs>,
  );
  expect(noItems.querySelectorAll("[role=tabpanel]:not([hidden])").length).toBe(
    1,
  );
});

it("ties each tab to its panel", () => {
  const container = render(
    <Tabs items={["One", "Two"]}>
      <Tab>First</Tab>
      <Tab>Second</Tab>
    </Tabs>,
  );
  const tab = container.querySelectorAll("[role=tab]")[1]!;
  const panel = container.querySelectorAll("[role=tabpanel]")[1]!;
  expect(tab.getAttribute("aria-controls")).toBe(panel.id);
  expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
});

it("keeps implicit tab values right when a tab is inserted or removed", () => {
  const tabsFor = (labels: string[]) => (
    <Tabs items={labels}>
      {labels.map((label) => (
        <Tab key={label}>{label} panel</Tab>
      ))}
    </Tabs>
  );
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(tabsFor(["B", "C"])));
  act(() => root.render(tabsFor(["A", "B", "C"])));
  expect(
    container.querySelector("[role=tabpanel]:not([hidden])")?.textContent,
  ).toBe("B panel");
  act(() => root.render(tabsFor(["A", "C"])));
  const visible = container.querySelector("[role=tabpanel]:not([hidden])");
  expect(visible?.textContent).toBe("A panel");
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
});

it("keeps tabs with one groupId together", () => {
  const container = render(
    <>
      <Tabs groupId="provider" items={["OpenAI", "Anthropic"]}>
        <Tab>a</Tab>
        <Tab>b</Tab>
      </Tabs>
      <Tabs groupId="provider" items={["OpenAI", "Anthropic"]}>
        <Tab>c</Tab>
        <Tab>d</Tab>
      </Tabs>
    </>,
  );
  const tabs = container.querySelectorAll<HTMLElement>("[role=tab]");
  act(() => tabs[1]!.click());
  expect(tabs[3]!.getAttribute("aria-selected")).toBe("true");
});

it("lets a controlled Tabs own the active value", () => {
  const onValueChange = vi.fn();
  const container = render(
    <Tabs items={["One", "Two"]} value="one" onValueChange={onValueChange}>
      <Tab>First</Tab>
      <Tab>Second</Tab>
    </Tabs>,
  );
  const tabs = container.querySelectorAll<HTMLElement>("[role=tab]");
  act(() => tabs[1]!.click());
  expect(onValueChange).toHaveBeenCalledWith("two");
  expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
});

it("renders a heading without an id as a plain heading", () => {
  const container = render(<Heading as="h2">Plain</Heading>);
  expect(container.querySelector("h2 a")).toBeNull();
  expect(container.querySelector("button")).toBeNull();
});

it("copies a heading's own link", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const container = render(
    <Heading as="h2" id="setup">
      Setup
    </Heading>,
  );
  await act(async () => container.querySelector("button")!.click());
  expect(writeText.mock.calls[0]![0]).toMatch(/#setup$/);
});

it("opens and closes a folder", () => {
  const container = render(
    <Folder name="src">
      <File name="index.ts" />
    </Folder>,
  );
  const button = container.querySelector("button")!;
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(container.textContent).not.toContain("index.ts");
  act(() => button.click());
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(container.textContent).toContain("index.ts");
});
